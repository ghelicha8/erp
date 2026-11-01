import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, FileSignature, Building2, HardHat, Truck, 
  ShoppingBag, Calculator, DollarSign, Percent, ShieldCheck, 
  Layers, AlertCircle, FileText, Plus, Trash2, Banknote, 
  UploadCloud, Lock, Unlock, Eye, HelpCircle, CheckSquare,
  Wrench, UserPlus, Sparkles, Scale, RefreshCw, Users, UserCheck,
  Calendar, Briefcase, FolderGit2
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import { useContractStore } from '../../../store/contractStore';
import type { 
  Contract, 
  ContractCategory, 
  PricingModel, 
  ContractStatus,
  ContractMeasurementItem,
  ContractGuarantee,
  ContractParty,
  ContractWitness
} from '../../../store/contractStore';
import { useProjectStore } from '../../projects/store/projectStore';
import type { Phase } from '../../projects/types/project.types';
import { useClientStore } from '../../../store/clientStore';
import { useLaborStore } from '../../../store/laborStore';
import { useProcurementStore } from '../../../store/procurementStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useSettingsStore } from '../../../store/settingsStore';
import ClientFormModal from '../../clients/components/ClientFormModal';
import SupplierModal from '../../procurement/components/SupplierModal';
import LaborFormModal from '../../labor/components/LaborFormModal';
import type { WorkerProfile } from '../../../store/laborStore';
import type { Supplier } from '../../../store/procurementStore';

import GlassDatePicker from '../../../components/ui/GlassDatePicker';
import { PortalSelect, AnimatedCheckbox, GlowSwitch } from '../../../components/ui/SharedLaborUI';
import { formatCurrency } from '../../../core/utils/currency';
import { numberToPersianWords } from '../../../core/utils/numToPersian';
import { generateUUID } from '../../../core/utils/uuid';

// ============================================================================
// کامپوننت مودال اصلی تنظیم و ویرایش قرارداد
// ============================================================================

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractToEdit?: Contract | null;
  defaultCategory?: ContractCategory;
  defaultProjectId?: string;
  defaultPartyId?: string;
}

const CATEGORY_OPTIONS: { id: ContractCategory; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'CLIENT_PROJECT', label: 'کارفرما و پروژه (درآمدی)', desc: 'قرارداد اجرای پروژه با کارفرما یا صاحب ملک', icon: Building2, color: 'from-emerald-500 to-teal-600' },
  { id: 'SUBCONTRACTOR_LABOR', label: 'پیمانکار فرعی / اکیپ (هزینه‌ای)', desc: 'قرارداد با استادکاران، اکیپ‌های آرماتوربند، گچ‌کار، بنا و...', icon: HardHat, color: 'from-blue-500 to-indigo-600' },
  { id: 'EQUIPMENT_RENTAL', label: 'اجاره ماشین‌آلات و ابزار', desc: 'قرارداد اجاره تاور کرین، بیل مکانیکی، بتونیر، قالب و داربست', icon: Truck, color: 'from-amber-500 to-orange-600' },
  { id: 'MATERIAL_SUPPLY', label: 'تأمین مصالح و بنکداری', desc: 'قرارداد خرید متریال از کارخانه فولاد، سیمان و معادن شن و ماسه', icon: ShoppingBag, color: 'from-purple-500 to-pink-600' },
];

const PRICING_MODEL_OPTIONS: { id: PricingModel; label: string; desc: string }[] = [
  { id: 'METRI_UNIT', label: 'متری / بر اساس ابعاد و فهرست‌بها', desc: 'محاسبه با جدول طول × عرض × ارتفاع × فی واحد' },
  { id: 'PERCENTAGE_MANAGEMENT', label: 'پیمان مدیریت (درصدی)', desc: 'درصد مشخص از کل هزینه‌های مصالح، نیرو و لجستیک' },
  { id: 'LUMPSUM_CONTRAT', label: 'مقطوع / کنترات', desc: 'مبلغ کل ثابت و تقسیط بر اساس مراحل پیشرفت کار' },
  { id: 'COST_PLUS', label: 'هزینه تمام‌شده + کارمزد (Cost-Plus)', desc: 'بهای تمام‌شده واقعی به علاوه حق‌الزحمه مشخص' },
  { id: 'HYBRID_PHASED', label: 'ترکیبی فازبه‌فاز', desc: 'تعیین مدل مالی مستقل برای هر فاز اجرایی' },
];

interface FormMeasurementRow {
  id: string;
  title: string;
  length: string;
  width: string;
  height: string;
  count: string;
  factor: string;
  unit: string;
  unitPrice: string;
}

interface PaymentStageRow {
  id: string;
  title: string;
  percentage: number;
}

interface FormParty {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  address: string;
  isCustom?: boolean;
}

interface FormContractor {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  address: string;
  role: string;
}

interface FormWitness {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
}

export default function ContractFormModal({
  isOpen,
  onClose,
  contractToEdit,
  defaultCategory,
  defaultProjectId,
  defaultPartyId,
}: ContractFormModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  const { addContract, updateContract } = useContractStore();
  const allProjects = useProjectStore((state) => state.projects) || [];
  const allClients = useClientStore((state) => state.clients) || [];
  const allWorkers = useLaborStore((state) => state.workers) || [];
  const allSuppliers = useProcurementStore((state) => state.suppliers) || [];
  const { settings } = useSettingsStore();

  const isEdit = Boolean(contractToEdit);

  // فرم فیلدها
  const [category, setCategory] = useState<ContractCategory>(defaultCategory || 'CLIENT_PROJECT');
  const [pricingModel, setPricingModel] = useState<PricingModel>('METRI_UNIT');
  const [status, setStatus] = useState<ContractStatus>('ACTIVE');
  const [title, setTitle] = useState('');
  const [contractNumber, setContractNumber] = useState('');

  // سوئیچ شبکه عنکبوتی (پیش‌فرض فعال)
  const [autoSyncSpiderWeb, setAutoSyncSpiderWeb] = useState(true);

  // پروژه و فازبندی
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [customProjectName, setCustomProjectName] = useState('');
  const [scopeType, setScopeType] = useState<'WHOLE_PROJECT' | 'SPECIFIC_PHASE'>('WHOLE_PROJECT');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [customPhaseName, setCustomPhaseName] = useState<string>('');

  // قانون قفل دوطرفه پروژه ⟷ کارفرما
  const [isClientLocked, setIsClientLocked] = useState(false);

  // کارفرمایان و مشتریان (چندگانه)
  const [employers, setEmployers] = useState<FormParty[]>([
    { id: defaultPartyId || `emp-1`, name: '', nationalId: '', phone: '', address: '', isCustom: false }
  ]);

  // شرکت پیمانکاری و مجریان (چندگانه)
  const [contractorCompany, setContractorCompany] = useState(settings.companyName || 'شرکت مهندسی و ساختمانی پیمان');
  const [contractors, setContractors] = useState<FormContractor[]>([
    { id: 'ctr-1', name: '', nationalId: '', phone: '', address: '', role: 'مجری / پیمانکار پروژه' }
  ]);

  // شاهدین قرارداد (چندگانه)
  const [witnesses, setWitnesses] = useState<FormWitness[]>([
    { id: 'wit-1', name: '', nationalId: '', phone: '' },
    { id: 'wit-2', name: '', nationalId: '', phone: '' }
  ]);

  // فیلدهای سازگاری تک طرف حسابی
  const [partyType, setPartyType] = useState<'CLIENT' | 'WORKER' | 'SUPPLIER' | 'EQUIPMENT_OWNER' | 'OTHER'>('CLIENT');
  const [partyId, setPartyId] = useState(defaultPartyId || '');
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [rentalDirection, setRentalDirection] = useState<'RENT_IN' | 'RENT_OUT'>('RENT_IN');

  // استیت‌های مودال‌های ساخت سریع
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isQuickWorkerOpen, setIsQuickWorkerOpen] = useState(false);
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

  // تاریخ‌های منعطف
  const [hasStartDate, setHasStartDate] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(true);
  const [startDate, setStartDate] = useState(moment().format('jYYYY/jMM/jDD'));
  const [initialEndDate, setInitialEndDate] = useState(moment().add(3, 'jMonth').format('jYYYY/jMM/jDD'));

  // مبالغ و ماشین‌حساب زنده
  const [initialAmount, setInitialAmount] = useState<number>(0);
  const [managementFeePercent, setManagementFeePercent] = useState<number>(12);
  const [managementEstimatedCost, setManagementEstimatedCost] = useState<number>(1000000000);
  const [applyOnPurchases, setApplyOnPurchases] = useState(true);
  const [applyOnLabor, setApplyOnLabor] = useState(true);
  const [applyOnLogistics, setApplyOnLogistics] = useState(true);

  // جدول ردیف‌های ابعادی / متری داخل فرم
  const [measurementRows, setMeasurementRows] = useState<FormMeasurementRow[]>([
    { id: 'row-1', title: 'عملیات سفت‌کاری و دیوارچینی', length: '20', width: '15', height: '3', count: '1', factor: '1', unit: 'مترمربع', unitPrice: '180000' }
  ]);

  // جدول مراحل پرداخت در حالت مقطوع
  const [paymentStages, setPaymentStages] = useState<PaymentStageRow[]>([
    { id: 'stg-1', title: 'پیش‌پرداخت در زمان عقد قرارداد', percentage: 20 },
    { id: 'stg-2', title: 'تکمیل فونداسیون و اسکلت اولیه', percentage: 40 },
    { id: 'stg-3', title: 'سفت‌کاری و تیغه‌چینی کامل', percentage: 25 },
    { id: 'stg-4', title: 'تحویل موقت و تسویه نهایی', percentage: 15 },
  ]);

  // کسورات قانونی و تضامین اولیه
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(0);
  const [retentionPercent, setRetentionPercent] = useState<number>(10);
  const [retentionReleaseDate, setRetentionReleaseDate] = useState(moment().add(6, 'jMonth').format('jYYYY/jMM/jDD'));
  const [insurancePercent, setInsurancePercent] = useState<number>(5);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [dailyDelayPenalty, setDailyDelayPenalty] = useState<number>(1500000);

  // تضمین اولیه (چک یا سفته)
  const [hasInitialGuarantee, setHasInitialGuarantee] = useState(false);
  const [guaranteeType, setGuaranteeType] = useState<'CHEQUE' | 'PROMISSORY_NOTE'>('CHEQUE');
  const [guaranteeSerial, setGuaranteeSerial] = useState('');
  const [guaranteeBank, setGuaranteeBank] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState<number>(0);
  const [guaranteeDueDate, setGuaranteeDueDate] = useState(moment().add(6, 'jMonth').format('jYYYY/jMM/jDD'));
  const [guaranteeImage, setGuaranteeImage] = useState<string>('');

  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');

  // بارگذاری مقادیر در حالت ادیت
  useEffect(() => {
    if (contractToEdit) {
      setCategory(contractToEdit.category);
      setPricingModel(contractToEdit.pricingModel);
      setStatus(contractToEdit.status);
      setTitle(contractToEdit.title);
      setContractNumber(contractToEdit.contractNumber);
      setProjectId(contractToEdit.projectId || '');
      setScopeType(contractToEdit.scopeType || 'WHOLE_PROJECT');
      setSelectedPhaseId(contractToEdit.phaseId || '');
      setCustomPhaseName(contractToEdit.phaseName || '');

      setPartyType(contractToEdit.partyType);
      setPartyId(contractToEdit.partyId || '');
      setPartyName(contractToEdit.partyName);
      setPartyPhone(contractToEdit.partyPhone || '');
      setRentalDirection(contractToEdit.rentalDirection || 'RENT_IN');

      // کارفرمایان
      if (contractToEdit.employers && contractToEdit.employers.length > 0) {
        setEmployers(contractToEdit.employers.map(e => ({
          id: e.id,
          name: e.name,
          nationalId: e.nationalId || '',
          phone: e.phone || '',
          address: e.address || '',
          isCustom: !allClients.some(c => c.id === e.id),
        })));
      } else if (contractToEdit.partyName) {
        setEmployers([{
          id: contractToEdit.partyId || `emp-${Date.now()}`,
          name: contractToEdit.partyName,
          nationalId: '',
          phone: contractToEdit.partyPhone || '',
          address: contractToEdit.location || '',
          isCustom: false,
        }]);
      }

      // شرکت پیمانکاری و مجریان
      if (contractToEdit.contractorCompany) {
        setContractorCompany(contractToEdit.contractorCompany);
      }
      if (contractToEdit.contractors && contractToEdit.contractors.length > 0) {
        setContractors(contractToEdit.contractors.map(c => ({
          id: c.id,
          name: c.name,
          nationalId: c.nationalId || '',
          phone: c.phone || '',
          role: c.role || 'مجری / پیمانکار پروژه',
        })));
      }

      // شاهدین
      if (contractToEdit.witnesses && contractToEdit.witnesses.length > 0) {
        setWitnesses(contractToEdit.witnesses.map(w => ({
          id: w.id,
          name: w.name,
          nationalId: w.nationalId || '',
          phone: w.phone || '',
        })));
      }

      // تاریخ‌ها
      setHasStartDate(contractToEdit.hasStartDate ?? Boolean(contractToEdit.startDate));
      setHasEndDate(contractToEdit.hasEndDate ?? Boolean(contractToEdit.initialEndDate));
      setStartDate(contractToEdit.startDate || moment().format('jYYYY/jMM/jDD'));
      setInitialEndDate(contractToEdit.initialEndDate || moment().add(3, 'jMonth').format('jYYYY/jMM/jDD'));

      setInitialAmount(contractToEdit.initialAmount || 0);
      setManagementFeePercent(contractToEdit.managementFeePercent || 12);
      setPrepaymentAmount(contractToEdit.prepaymentAmount || 0);
      setRetentionPercent(contractToEdit.retentionPercent ?? 10);
      setRetentionReleaseDate(contractToEdit.retentionReleaseDate || '');
      setInsurancePercent(contractToEdit.insurancePercent || 0);
      setTaxPercent(contractToEdit.taxPercent || 0);
      setDailyDelayPenalty(contractToEdit.dailyDelayPenalty || 0);
      setSubject(contractToEdit.subject || '');
      setLocation(contractToEdit.location || '');

      // بارگذاری ردیف‌های متره در صورت وجود
      if (contractToEdit.measurementItems && contractToEdit.measurementItems.length > 0) {
        setMeasurementRows(contractToEdit.measurementItems.map(m => ({
          id: m.id,
          title: m.description,
          length: m.length ? m.length.toString() : '',
          width: m.width ? m.width.toString() : '',
          height: m.height ? m.height.toString() : '',
          count: m.count ? m.count.toString() : '1',
          factor: m.factor ? m.factor.toString() : '1',
          unit: m.unit,
          unitPrice: m.unitPrice.toString(),
        })));
      }
    } else {
      const randNum = Math.floor(100 + Math.random() * 900);
      const year = moment().format('jYY');
      setContractNumber(`CNT-${year}-${randNum}`);
      if (defaultPartyId) {
        const client = allClients.find(c => c.id === defaultPartyId);
        if (client) {
          const fullName = `${client.name} ${client.lastName || ''}`.trim();
          setEmployers([{
            id: client.id,
            name: fullName,
            nationalId: client.nationalId || '',
            phone: client.phone || '',
            address: client.address || '',
            isCustom: false,
          }]);
          setPartyName(fullName);
          setPartyPhone(client.phone || '');
        }
      }
    }
  }, [contractToEdit]);

  // منطق قفل دوطرفه: انتخاب پروژه -> کارفرمای آن خودکار انتخاب و قفل شود
  const handleSelectProject = (pId: string) => {
    setProjectId(pId);
    if (!pId) {
      setIsClientLocked(false);
      setSelectedPhaseId('');
      return;
    }

    const selectedProj = allProjects.find(p => p.id === pId);
    if (selectedProj) {
      if (selectedProj.phases && selectedProj.phases.length > 0) {
        setSelectedPhaseId(selectedProj.phases[0].id);
        setCustomPhaseName(selectedProj.phases[0].name);
      }

      if (category === 'CLIENT_PROJECT' && selectedProj.clientId) {
        const client = allClients.find(c => c.id === selectedProj.clientId);
        if (client) {
          const fullName = `${client.name} ${client.lastName || ''}`.trim();
          setPartyId(client.id);
          setPartyName(fullName);
          setPartyPhone(client.phone || '');
          setEmployers([{
            id: client.id,
            name: fullName,
            phone: client.phone || '',
            nationalId: client.nationalId || '',
            address: client.address || '',
            isCustom: false,
          }]);
          setIsClientLocked(true);
        }
      } else {
        setIsClientLocked(false);
      }
    }
  };

  // گزینه‌های پروژه متناسب با کارفرمای انتخاب‌شده
  const filteredProjectOptions = useMemo(() => {
    let projs = allProjects;
    if (category === 'CLIENT_PROJECT' && employers[0]?.id && !isClientLocked && employers[0]?.id !== 'CUSTOM') {
      const clientProjs = allProjects.filter(p => p.clientId === employers[0].id);
      if (clientProjs.length > 0) projs = clientProjs;
    }
    return [
      { id: '', label: 'بدون پروژه مشخص (پروژه جدید / مستقل در شبکه عنکبوتی)' },
      { id: 'NEW_PROJECT', label: '+ تعریف و ساخت پروژه جدید با نام دلخواه...' },
      ...projs.map(p => ({
        id: p.id,
        label: p.name,
      }))
    ];
  }, [allProjects, category, employers, isClientLocked]);

  const selectedProj = useMemo(() => allProjects.find(p => p.id === projectId), [allProjects, projectId]);

  const phaseOptions = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (selectedProj && selectedProj.phases && selectedProj.phases.length > 0) {
      selectedProj.phases.forEach((ph, idx) => {
        list.push({
          id: ph.id,
          label: `${ph.name || `فاز ${idx + 1}`} (${formatCurrency(ph.financials?.expenditure || ph.fixedPrice || 0)})`
        });
      });
    }
    list.push({ id: 'NEW_PHASE', label: '+ تعریف فاز جدید برای این پروژه' });
    return list;
  }, [selectedProj]);

  // توابع مدیریت کارفرمایان
  const handleAddEmployer = () => {
    setEmployers(prev => [
      ...prev,
      { id: `emp-${Date.now()}-${prev.length}`, name: '', nationalId: '', phone: '', address: '', isCustom: true }
    ]);
  };

  const handleRemoveEmployer = (index: number) => {
    if (employers.length <= 1) {
      toast.info('حداقل یک کارفرما / طرف حساب در قرارداد الزامی است');
      return;
    }
    setEmployers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateEmployer = (index: number, field: keyof FormParty, value: string) => {
    setEmployers(prev => prev.map((emp, idx) => {
      if (idx === index) {
        const updated = { ...emp, [field]: value };
        if (idx === 0 && field === 'name') setPartyName(value);
        if (idx === 0 && field === 'phone') setPartyPhone(value);
        return updated;
      }
      return emp;
    }));
  };

  const handleSelectClientForEmployer = (index: number, clientId: string) => {
    if (clientId === 'CUSTOM') {
      setEmployers(prev => prev.map((emp, idx) => idx === index ? { ...emp, isCustom: true } : emp));
      return;
    }
    const client = allClients.find(c => c.id === clientId);
    if (client) {
      const fullName = `${client.name} ${client.lastName || ''}`.trim();
      setEmployers(prev => prev.map((emp, idx) => {
        if (idx === index) {
          return {
            ...emp,
            id: client.id,
            name: fullName,
            phone: client.phone || '',
            nationalId: client.nationalId || '',
            address: client.address || '',
            isCustom: false,
          };
        }
        return emp;
      }));
      if (index === 0) {
        setPartyId(client.id);
        setPartyName(fullName);
        setPartyPhone(client.phone || '');
      }
    }
  };

  // توابع مدیریت مجریان
  const handleAddContractor = () => {
    setContractors(prev => [
      ...prev,
      { id: `ctr-${Date.now()}-${prev.length}`, name: '', nationalId: '', phone: '', role: 'مجری / پیمانکار همکار' }
    ]);
  };

  const handleRemoveContractor = (index: number) => {
    if (contractors.length <= 1) {
      toast.info('حداقل یک پیمانکار / مجری در قرارداد لازم است');
      return;
    }
    setContractors(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateContractor = (index: number, field: keyof FormContractor, value: string) => {
    setContractors(prev => prev.map((c, idx) => idx === index ? { ...c, [field]: value } : c));
  };

  // توابع مدیریت شاهدین
  const handleAddWitness = () => {
    setWitnesses(prev => [
      ...prev,
      { id: `wit-${Date.now()}-${prev.length}`, name: '', nationalId: '', phone: '' }
    ]);
  };

  const handleRemoveWitness = (index: number) => {
    setWitnesses(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateWitness = (index: number, field: keyof FormWitness, value: string) => {
    setWitnesses(prev => prev.map((w, idx) => idx === index ? { ...w, [field]: value } : w));
  };

  // محاسبه زنده متراژ و مبلغ کل در حالت METRI_UNIT
  const metriCalculations = useMemo(() => {
    let totalMetr = 0;
    let totalMetriPrice = 0;

    measurementRows.forEach(row => {
      const l = parseFloat(row.length) || 0;
      const w = parseFloat(row.width) || 0;
      const h = parseFloat(row.height) || 0;
      const c = parseFloat(row.count) || 1;
      const f = parseFloat(row.factor) || 1;
      const price = parseFloat(row.unitPrice.replace(/\D/g, '')) || 0;

      let rowQty = 0;
      if (l > 0 && w > 0 && h > 0) rowQty = l * w * h * c * f;
      else if (l > 0 && w > 0) rowQty = l * w * c * f;
      else if (l > 0) rowQty = l * c * f;
      else rowQty = c * f;

      totalMetr += rowQty;
      totalMetriPrice += (rowQty * price);
    });

    return { totalMetr: Number(totalMetr.toFixed(2)), totalMetriPrice: Math.round(totalMetriPrice) };
  }, [measurementRows]);

  // اگر متری انتخاب شده باشد، مبلغ اولیه با مجموع جدول به‌روز شود
  useEffect(() => {
    if (pricingModel === 'METRI_UNIT' && metriCalculations.totalMetriPrice > 0) {
      setInitialAmount(metriCalculations.totalMetriPrice);
    }
  }, [pricingModel, metriCalculations.totalMetriPrice]);

  // افزودن ردیف ابعادی
  const handleAddMeasurementRow = () => {
    setMeasurementRows(prev => [
      ...prev,
      { id: `row-${Date.now()}`, title: '', length: '', width: '', height: '', count: '1', factor: '1', unit: 'مترمربع', unitPrice: '0' }
    ]);
  };

  const handleUpdateMeasurementRow = (id: string, field: keyof FormMeasurementRow, val: string) => {
    setMeasurementRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const handleDeleteMeasurementRow = (id: string) => {
    if (measurementRows.length <= 1) {
      toast.info('حداقل یک ردیف در جدول ابعاد لازم است');
      return;
    }
    setMeasurementRows(prev => prev.filter(r => r.id !== id));
  };

  // محاسبه مبلغ حق‌الزحمه پیمان مدیریت
  const computedManagementFee = Math.round((managementEstimatedCost * managementFeePercent) / 100);

  // ثبت نهایی فرم
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('لطفاً عنوان رسمی قرارداد را وارد کنید');
      return;
    }

    const validEmployers = employers.filter(e => e.name && e.name.trim());
    if (category === 'CLIENT_PROJECT' && validEmployers.length === 0 && !partyName.trim()) {
      toast.error('لطفاً مشخصات حداقل یک کارفرما را برای قرارداد تعیین کنید');
      return;
    }

    const finalPrimaryEmployerName = validEmployers[0]?.name?.trim() || partyName.trim() || 'کارفرمای پروژه';
    const finalPrimaryEmployerPhone = validEmployers[0]?.phone?.trim() || partyPhone.trim();

    const finalEmployersList: ContractParty[] = validEmployers.length > 0
      ? validEmployers.map(e => ({
          id: e.id,
          name: e.name.trim(),
          nationalId: e.nationalId?.trim() || undefined,
          phone: e.phone?.trim() || undefined,
          address: e.address?.trim() || undefined,
          role: 'کارفرما',
        }))
      : [{
          id: partyId || `emp-${Date.now()}`,
          name: finalPrimaryEmployerName,
          phone: finalPrimaryEmployerPhone || undefined,
          role: 'کارفرما',
        }];

    const validContractors = contractors.filter(c => c.name && c.name.trim());
    const finalContractorsList: ContractParty[] = validContractors.map(c => ({
      id: c.id,
      name: c.name.trim(),
      nationalId: c.nationalId?.trim() || undefined,
      phone: c.phone?.trim() || undefined,
      address: c.address?.trim() || undefined,
      role: c.role?.trim() || 'پیمانکار / مجری',
    }));

    const validWitnesses = witnesses.filter(w => w.name && w.name.trim());
    const finalWitnessesList: ContractWitness[] = validWitnesses.map(w => ({
      id: w.id,
      name: w.name.trim(),
      nationalId: w.nationalId?.trim() || undefined,
      phone: w.phone?.trim() || undefined,
    }));

    let effectivePhaseName = '';
    if (scopeType === 'SPECIFIC_PHASE') {
      if (selectedPhaseId && selectedPhaseId !== 'NEW_PHASE') {
        const found = selectedProj?.phases?.find(p => p.id === selectedPhaseId);
        effectivePhaseName = found?.name || customPhaseName.trim();
      } else {
        effectivePhaseName = customPhaseName.trim() || title.trim();
      }
    }

    // تبدیل ردیف‌های متره به آیتم‌های استور
    const finalMeasurementItems: ContractMeasurementItem[] = pricingModel === 'METRI_UNIT'
      ? measurementRows.map((r, idx) => {
          const l = parseFloat(r.length) || undefined;
          const w = parseFloat(r.width) || undefined;
          const h = parseFloat(r.height) || undefined;
          const c = parseFloat(r.count) || 1;
          const f = parseFloat(r.factor) || 1;
          const price = parseFloat(r.unitPrice.replace(/\D/g, '')) || 0;
          let qty = 0;
          if (l && w && h) qty = l * w * h * c * f;
          else if (l && w) qty = l * w * c * f;
          else if (l) qty = l * c * f;
          else qty = c * f;
          return {
            id: r.id,
            contractId: contractToEdit?.id || '',
            rowNumber: idx + 1,
            description: r.title.trim() || 'ردیف کاری بدون عنوان',
            unit: r.unit,
            length: l,
            width: w,
            height: h,
            count: c,
            factor: f,
            quantity: Number(qty.toFixed(2)),
            unitPrice: price,
            totalPrice: Math.round(qty * price),
            completedQuantity: 0,
          };
        })
      : [];

    // ساخت ضمانت اولیه در صورت فعال بودن
    const initialGuarantees: ContractGuarantee[] = hasInitialGuarantee && guaranteeSerial
      ? [{
          id: `g_init_${Date.now()}`,
          contractId: contractToEdit?.id || '',
          type: guaranteeType,
          serialNumber: guaranteeSerial.trim(),
          bankName: guaranteeBank.trim() || undefined,
          amount: guaranteeAmount || (initialAmount * 0.1),
          dueDate: guaranteeDueDate,
          direction: category === 'CLIENT_PROJECT' ? 'RECEIVED' : 'GIVEN',
          status: 'HELD',
          image: guaranteeImage || undefined,
          description: 'تضمین حسن اجرای تعهدات قرارداد',
        }]
      : [];

    let finalProjectId = projectId;
    let finalProjectName = selectedProj?.name;

    // ==========================================
    // ۲. همگام‌سازی خودکار در شبکه عنکبوتی (Spider-Web Auto-Sync)
    // ==========================================
    if (autoSyncSpiderWeb) {
      // الف) کارفرمایان: اگر در clientStore نبود، ثبت خودکار پروفایل
      const clientStore = useClientStore.getState();
      let primaryClientId = validEmployers[0]?.id;

      finalEmployersList.forEach((emp, idx) => {
        const existingClient = clientStore.clients.find(
          c => c.id === emp.id || 
               (`${c.name} ${c.lastName || ''}`.trim().toLowerCase() === emp.name.trim().toLowerCase()) ||
               (emp.phone && emp.phone.trim() && c.phone === emp.phone.trim())
        );
        if (!existingClient) {
          const parts = emp.name.trim().split(' ');
          const fName = parts[0] || emp.name.trim();
          const lName = parts.slice(1).join(' ') || '';
          const created = clientStore.addClient({
            name: fName,
            lastName: lName,
            phone: emp.phone?.trim() || '---',
            nationalId: emp.nationalId?.trim() || undefined,
            address: emp.address?.trim() || undefined,
            type: 'PERSON',
            walletBalance: 0,
          });
          if (idx === 0) {
            primaryClientId = created.id;
          }
        } else if (idx === 0) {
          primaryClientId = existingClient.id;
        }
      });

      // ب) پروژه و فاز جدید در projectStore
      const projectStore = useProjectStore.getState();
      const targetProjectName = customProjectName.trim() || selectedProj?.name || title.trim();

      let targetProj = (finalProjectId && finalProjectId !== 'NEW_PROJECT') 
        ? projectStore.projects.find(p => p.id === finalProjectId) 
        : null;

      if (!targetProj && targetProjectName) {
        targetProj = projectStore.projects.find(
          p => p.name.trim().toLowerCase() === targetProjectName.trim().toLowerCase()
        ) || null;
      }

      const projectContractType: ContractType = 
        pricingModel === 'LUMPSUM_CONTRAT' ? 'CONTRAT' :
        pricingModel === 'METRI_UNIT' ? 'METRI' :
        pricingModel === 'PERCENTAGE_MANAGEMENT' ? 'PERCENTAGE' : 'CUSTOM';

      const phaseTitle = effectivePhaseName || 'فاز اجرایی - ' + title.trim();

      if (!targetProj) {
        // پروژه وجود ندارد -> ساخت پروژه جدید متصل به کارفرما با نوع قرارداد و مبلغ
        const newProjId = generateUUID();
        finalProjectId = newProjId;
        finalProjectName = targetProjectName;

        const newPhase: Phase = {
          id: `ph_${Date.now()}`,
          name: phaseTitle,
          description: subject.trim() || `عملیات اجرایی قرارداد ${contractNumber}`,
          isCompleted: status === 'COMPLETED',
          contractType: projectContractType,
          contractorPercentage: pricingModel === 'PERCENTAGE_MANAGEMENT' ? managementFeePercent : undefined,
          fixedPrice: (pricingModel === 'LUMPSUM_CONTRAT' || pricingModel === 'METRI_UNIT') ? initialAmount : undefined,
          unitPrice: pricingModel === 'METRI_UNIT' ? initialAmount : undefined,
          photos: [],
          financials: { expenditure: initialAmount || 0 },
        };

        projectStore.addProject({
          id: newProjId,
          name: finalProjectName,
          clientId: primaryClientId || 'default-client',
          startDate: hasStartDate && startDate ? startDate : moment().format('jYYYY/jMM/jDD'),
          status: status === 'COMPLETED' ? 'FINISHED' : (status === 'SUSPENDED' ? 'PAUSED' : 'IN_PROGRESS'),
          photos: [],
          phases: [newPhase],
          financials: { totalExpenditure: 0, estimatedProfit: 0 },
          laborRecords: [],
          address: location.trim() || undefined,
        });
      } else {
        // پروژه از قبل وجود دارد -> افزودن فاز جدید به آرایه phases یا به‌روزرسانی فاز مرتبط
        finalProjectId = targetProj.id;
        finalProjectName = targetProj.name;

        const existingPhaseIdx = targetProj.phases?.findIndex(
          ph => (selectedPhaseId && ph.id === selectedPhaseId && selectedPhaseId !== 'NEW_PHASE') ||
                ph.name.trim().toLowerCase() === phaseTitle.trim().toLowerCase()
        );

        if (existingPhaseIdx !== undefined && existingPhaseIdx >= 0 && targetProj.phases) {
          const updatedPhases = [...targetProj.phases];
          const oldPhase = updatedPhases[existingPhaseIdx];
          updatedPhases[existingPhaseIdx] = {
            ...oldPhase,
            name: phaseTitle,
            contractType: projectContractType,
            contractorPercentage: pricingModel === 'PERCENTAGE_MANAGEMENT' ? managementFeePercent : oldPhase.contractorPercentage,
            fixedPrice: (pricingModel === 'LUMPSUM_CONTRAT' || pricingModel === 'METRI_UNIT') ? initialAmount : oldPhase.fixedPrice,
            unitPrice: pricingModel === 'METRI_UNIT' ? initialAmount : oldPhase.unitPrice,
            financials: { expenditure: initialAmount || oldPhase.financials?.expenditure || 0 },
            isCompleted: status === 'COMPLETED' ? true : oldPhase.isCompleted,
          };
          projectStore.updateProject(targetProj.id, {
            phases: updatedPhases,
            ...(location.trim() && !targetProj.address ? { address: location.trim() } : {})
          });
        } else {
          const newPhase: Phase = {
            id: `ph_${Date.now()}`,
            name: phaseTitle,
            description: subject.trim() || `عملیات اجرایی قرارداد ${contractNumber}`,
            isCompleted: status === 'COMPLETED',
            contractType: projectContractType,
            contractorPercentage: pricingModel === 'PERCENTAGE_MANAGEMENT' ? managementFeePercent : undefined,
            fixedPrice: (pricingModel === 'LUMPSUM_CONTRAT' || pricingModel === 'METRI_UNIT') ? initialAmount : undefined,
            unitPrice: pricingModel === 'METRI_UNIT' ? initialAmount : undefined,
            photos: [],
            financials: { expenditure: initialAmount || 0 },
          };
          projectStore.updateProject(targetProj.id, {
            phases: [...(targetProj.phases || []), newPhase],
            ...(location.trim() && !targetProj.address ? { address: location.trim() } : {})
          });
        }
      }
    }

    const finalStartDate = hasStartDate ? startDate : '';
    const finalEndDate = hasEndDate ? initialEndDate : '';

    if (isEdit && contractToEdit) {
      updateContract(contractToEdit.id, {
        title: title.trim(),
        contractNumber: contractNumber.trim() || contractToEdit.contractNumber,
        category,
        pricingModel,
        status,
        projectId: finalProjectId || undefined,
        projectName: finalProjectName,
        scopeType,
        phaseId: selectedPhaseId !== 'NEW_PHASE' ? selectedPhaseId : undefined,
        phaseName: effectivePhaseName || undefined,
        partyType,
        partyId: validEmployers[0]?.id || partyId || undefined,
        partyName: finalPrimaryEmployerName,
        partyPhone: finalPrimaryEmployerPhone,
        employers: finalEmployersList,
        contractorCompany: contractorCompany.trim(),
        companyBrandName: contractorCompany.trim(),
        contractors: finalContractorsList,
        witnesses: finalWitnessesList,
        hasStartDate,
        hasEndDate,
        startDate: finalStartDate,
        initialEndDate: finalEndDate,
        rentalDirection: category === 'EQUIPMENT_RENTAL' ? rentalDirection : undefined,
        initialAmount,
        managementFeePercent: pricingModel === 'PERCENTAGE_MANAGEMENT' ? managementFeePercent : undefined,
        prepaymentAmount,
        retentionPercent,
        retentionReleaseDate,
        insurancePercent,
        taxPercent,
        dailyDelayPenalty,
        subject: subject.trim(),
        location: location.trim(),
        measurementItems: finalMeasurementItems.length > 0 ? finalMeasurementItems : contractToEdit.measurementItems,
      });
      toast.success('قرارداد با موفقیت به‌روزرسانی شد');
    } else {
      addContract({
        title: title.trim(),
        contractNumber: contractNumber.trim() || `CNT-${Date.now().toString().slice(-6)}`,
        category,
        pricingModel,
        status,
        projectId: finalProjectId || undefined,
        projectName: finalProjectName,
        scopeType,
        phaseId: selectedPhaseId !== 'NEW_PHASE' ? selectedPhaseId : undefined,
        phaseName: effectivePhaseName || undefined,
        partyType,
        partyId: validEmployers[0]?.id || partyId || undefined,
        partyName: finalPrimaryEmployerName,
        partyPhone: finalPrimaryEmployerPhone,
        employers: finalEmployersList,
        contractorCompany: contractorCompany.trim(),
        companyBrandName: contractorCompany.trim(),
        contractors: finalContractorsList,
        witnesses: finalWitnessesList,
        hasStartDate,
        hasEndDate,
        startDate: finalStartDate,
        initialEndDate: finalEndDate,
        currentEndDate: finalEndDate,
        rentalDirection: category === 'EQUIPMENT_RENTAL' ? rentalDirection : undefined,
        initialAmount,
        managementFeePercent: pricingModel === 'PERCENTAGE_MANAGEMENT' ? managementFeePercent : undefined,
        prepaymentAmount,
        retentionPercent,
        retentionReleaseDate,
        retentionReleased: false,
        insurancePercent,
        taxPercent,
        dailyDelayPenalty,
        subject: subject.trim(),
        location: location.trim(),
        guarantees: initialGuarantees,
        measurementItems: finalMeasurementItems,
      });
      toast.success('قرارداد جدید با موفقیت منعقد گردید');
    }

    onClose();
  };

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* بک‌دراپ بلوری */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      {/* پنجره مودال اصلی */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden my-auto z-10 max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* هدر گرادینتی مودال */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                {isEdit ? 'ویرایش جامع مشخصات و مفاد قرارداد' : 'تنظیم و انعقاد رسمی قرارداد جدید'}
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                موتور چندکارفرمایی، فازبندی پروژه‌ها و همگام‌سازی خودکار شبکه عنکبوتی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه فرم اسکرول‌پذیر با کنتراست ۱۰۰٪ */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 modal-scrollbar text-slate-900 dark:text-white">
          
          {/* ۱. سوئیچ گرافیکی درخشان شبکه عنکبوتی */}
          <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
            <GlowSwitch
              checked={autoSyncSpiderWeb}
              onChange={setAutoSyncSpiderWeb}
              label="ثبت و ساخت خودکار پروفایل کارفرما، پروژه و فاز در سیستم (شبکه عنکبوتی)"
              sublabel="ایجاد خودکار کارفرمایان ناشناس در سامانه، تشکیل پروژه جدید یا ثبت فاز اختصاصی در پروژه موجود"
              theme="emerald"
            />
          </div>

          {/* ۲. انتخاب دسته‌بندی طرف حساب */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
              ۱. دسته‌بندی طرف حساب و نوع قرارداد:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      if (cat.id === 'CLIENT_PROJECT') setPartyType('CLIENT');
                      else if (cat.id === 'SUBCONTRACTOR_LABOR') setPartyType('WORKER');
                      else if (cat.id === 'MATERIAL_SUPPLY') setPartyType('SUPPLIER');
                      else if (cat.id === 'EQUIPMENT_RENTAL') setPartyType('EQUIPMENT_OWNER');
                      setPartyId('');
                      setPartyName('');
                      setIsClientLocked(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">انتخاب شده</span>}
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-800 dark:text-white">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5 leading-tight">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ۳. اطلاعات پایه: عنوان و شماره قرارداد و وضعیت */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان رسمی قرارداد <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: قرارداد اجرای اسکلت بتنی و سفت‌کاری برج بهاران"
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                شماره قرارداد:
              </label>
              <input
                type="text"
                autoComplete="off"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                dir="ltr"
                placeholder="CNT-1403-010"
                className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                وضعیت اولیه:
              </label>
              <PortalSelect
                options={[
                  { id: 'ACTIVE', label: 'فعال / در حال اجرا' },
                  { id: 'DRAFT', label: 'پیش‌نویس اولیه' },
                  { id: 'SUSPENDED', label: 'معلق / متوقف' },
                  { id: 'COMPLETED', label: 'تکمیل و تسویه شده' },
                  { id: 'TERMINATED', label: 'فسخ شده' },
                ]}
                value={status}
                onChange={(val) => setStatus(val)}
                placeholder="وضعیت..."
                searchable={true}
                className="!h-12 !rounded-2xl"
              />
            </div>
          </div>

          {/* ۴. تعیین پروژه و فازبندی (Project & Scope) */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-500" />
                تعیین پروژه و حوزه شمول قرارداد در سیستم:
              </span>
              {isClientLocked && (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> کارفرما بر اساس پروژه انتخابی قفل است
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* انتخاب پروژه */}
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">
                  پروژه مرتبط در سیستم:
                </label>
                <PortalSelect
                  options={filteredProjectOptions}
                  value={projectId}
                  onChange={(val) => handleSelectProject(val)}
                  placeholder="انتخاب پروژه..."
                  searchable={true}
                  className="!h-12 !rounded-2xl"
                />
              </div>

              {/* ورودی تایپ نام پروژه جدید و آدرس محل اجرا */}
              {(!projectId || projectId === 'NEW_PROJECT') && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      نام پروژه جدید (تایپ مستقیم جهت ساخت خودکار در سیستم):
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value)}
                      placeholder="مثلاً: پروژه مجتمع مسکونی و تجاری بهاران"
                      className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      آدرس دقیق محل اجرای کار (نشانی کارگاه پروژه):
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="شهر، خیابان، پلاک، نشانی کارگاه پروژه..."
                      className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              )}

              {/* حوزه شمول: کل پروژه یا فاز مشخص */}
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-1.5">
                  حوزه شمول و سطح پیمان:
                </label>
                <div className="grid grid-cols-2 gap-2 h-12">
                  <button
                    type="button"
                    onClick={() => setScopeType('WHOLE_PROJECT')}
                    className={`h-full rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      scopeType === 'WHOLE_PROJECT'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>کل پروژه (عمومی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopeType('SPECIFIC_PHASE')}
                    className={`h-full rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      scopeType === 'SPECIFIC_PHASE'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>فاز مشخصی از پروژه</span>
                  </button>
                </div>
              </div>
            </div>

            {/* اگر فاز مشخصی انتخاب شده باشد */}
            {scopeType === 'SPECIFIC_PHASE' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    انتخاب فاز پروژه:
                  </label>
                  <PortalSelect
                    options={phaseOptions}
                    value={selectedPhaseId}
                    onChange={(val) => {
                      setSelectedPhaseId(val);
                      if (val !== 'NEW_PHASE') {
                        const p = selectedProj?.phases?.find(ph => ph.id === val);
                        if (p) setCustomPhaseName(p.name);
                      }
                    }}
                    placeholder="انتخاب فاز موجود..."
                    searchable={true}
                    className="!h-11 !rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    نام فاز / مرحله کاری پیمان:
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={customPhaseName}
                    onChange={(e) => setCustomPhaseName(e.target.value)}
                    placeholder="مثلاً: فاز دوم - اسکلت بتنی و سقف‌ها"
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* ۵. مشخصات کارفرمایان / طرف‌های اول (با پشتیبانی از چند کارفرما) */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  مشخصات کارفرمایان و مشتریان طرف قرارداد:
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  (امکان ثبت یک یا چند کارفرما / شریک سرمایه‌گذار)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isClientLocked && (
                  <button
                    type="button"
                    onClick={() => setIsClientLocked(false)}
                    className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" /> باز کردن قفل کارفرما
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + ساخت سریع کارفرما
                </button>

                <button
                  type="button"
                  onClick={handleAddEmployer}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1 cursor-pointer bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> + افزودن کارفرما / شریک
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {employers.map((emp, index) => (
                <div
                  key={emp.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 relative shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                        {index + 1}
                      </span>
                      {index === 0 ? 'کارفرمای اصلی / طرف حساب اول' : `کارفرما / شریک شماره ${index + 1}`}
                    </span>

                    {employers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmployer(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="حذف این کارفرما"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* انتخاب سریع از بین کارفرمایان موجود */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        انتخاب از فهرست:
                      </label>
                      <PortalSelect
                        options={[
                          { id: 'CUSTOM', label: 'ورود دستی / آزاد' },
                          ...allClients.map(c => ({ id: c.id, label: `${c.name} ${c.lastName || ''}`.trim() }))
                        ]}
                        value={emp.id}
                        disabled={isClientLocked && index === 0}
                        onChange={(val) => handleSelectClientForEmployer(index, val)}
                        placeholder="انتخاب کارفرما..."
                        searchable={true}
                        className="!h-10 !rounded-xl"
                      />
                    </div>

                    {/* نام و نام خانوادگی */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        نام و نام خانوادگی / شرکت <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={emp.name}
                        onChange={(e) => handleUpdateEmployer(index, 'name', e.target.value)}
                        placeholder="مثلاً: مهندس محمدرضا رضایی"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    {/* کد ملی / شناسه */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        کد ملی / شناسه ملی:
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={emp.nationalId}
                        onChange={(e) => handleUpdateEmployer(index, 'nationalId', e.target.value)}
                        placeholder="۱۰ رقم کد ملی"
                        className="w-full h-10 px-3 text-center rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    {/* تلفن تماس */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        شماره تلفن همراه:
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={emp.phone}
                        onChange={(e) => handleUpdateEmployer(index, 'phone', e.target.value)}
                        placeholder="0912..."
                        className="w-full h-10 px-3 text-center rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* نشانی کارفرما */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      نشانی قانونی / اقامتگاه کارفرما:
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={emp.address}
                      onChange={(e) => handleUpdateEmployer(index, 'address', e.target.value)}
                      placeholder="شهر، خیابان، پلاک، واحد..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ۶. مشخصات شرکت پیمانکاری و مجریان پروژه */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  مشخصات شرکت پیمانکاری و مجریان / پیمانکاران:
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddContractor}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl border border-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> + افزودن مجری / پیمانکار
              </button>
            </div>

            {/* نام شرکت پیمانکاری */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                نام شرکت / برند پیمانکاری مجری:
              </label>
              <input
                type="text"
                autoComplete="off"
                value={contractorCompany}
                onChange={(e) => setContractorCompany(e.target.value)}
                placeholder="مثلاً: شرکت مهندسی و ساختمانی پیمان"
                className="w-full h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* مجریان */}
            <div className="space-y-3">
              {contractors.map((ctr, index) => (
                <div
                  key={ctr.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative"
                >
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">نام مجری / شخص:</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={ctr.name}
                      onChange={(e) => handleUpdateContractor(index, 'name', e.target.value)}
                      placeholder="نام مهندس / پیمانکار"
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">سمت / تخصص:</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={ctr.role}
                      onChange={(e) => handleUpdateContractor(index, 'role', e.target.value)}
                      placeholder="مثلاً: مدیر پروژه / استادکار"
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">کد ملی / شناسه:</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={ctr.nationalId}
                      onChange={(e) => handleUpdateContractor(index, 'nationalId', e.target.value)}
                      placeholder="کد ملی"
                      className="w-full h-9 px-2.5 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-500 mb-1">شماره تماس:</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={ctr.phone}
                        onChange={(e) => handleUpdateContractor(index, 'phone', e.target.value)}
                        placeholder="0912..."
                        className="w-full h-9 px-2.5 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    {contractors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContractor(index)}
                        className="mt-4 p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="حذف مجری"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[10px] font-black text-slate-500 mb-1">نشانی / اقامتگاه قانونی مجری:</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={ctr.address}
                      onChange={(e) => handleUpdateContractor(index, 'address', e.target.value)}
                      placeholder="شهر، خیابان، پلاک، طبقه یا واحد دفتر پیمانکاری..."
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ۷. شاهدین معتبر قرارداد */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  شاهدین معتبر قرارداد (جهت درج در برگه چاپی رسمی و امضا):
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddWitness}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-500 flex items-center gap-1 cursor-pointer bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-xl border border-purple-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> + افزودن شاهد
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {witnesses.map((wit, index) => (
                <div
                  key={wit.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">
                      شاهد شماره {index + 1}:
                    </span>
                    {witnesses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWitness(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <input
                        type="text"
                        autoComplete="off"
                        value={wit.name}
                        onChange={(e) => handleUpdateWitness(index, 'name', e.target.value)}
                        placeholder="نام و نام خانوادگی"
                        className="w-full h-9 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        autoComplete="off"
                        value={wit.nationalId}
                        onChange={(e) => handleUpdateWitness(index, 'nationalId', e.target.value)}
                        placeholder="کد ملی"
                        className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        autoComplete="off"
                        value={wit.phone}
                        onChange={(e) => handleUpdateWitness(index, 'phone', e.target.value)}
                        placeholder="شماره تلفن"
                        className="w-full h-9 px-2 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ۸. ماشین‌حساب زنده مدل قرارداد */}
          <div className="p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/60 pb-3">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                ماشین‌حساب و مدل مالی قرارداد:
              </span>
              <div className="flex items-center gap-2">
                {PRICING_MODEL_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPricingModel(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      pricingModel === m.id
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* حالت الف: مدل متری / ابعادی با جدول ابعاد زنده */}
            {pricingModel === 'METRI_UNIT' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    جدول ریز ابعاد، احجام و برآورد زنده مبالغ:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMeasurementRow}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> افزودن ردیف متره
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-amber-200 dark:border-amber-800/80 text-[11px] font-black text-slate-500 bg-white/60 dark:bg-slate-900/60">
                        <th className="p-2.5">شرح بخش / آیتم</th>
                        <th className="p-2.5 text-center w-20">طول (متر)</th>
                        <th className="p-2.5 text-center w-20">عرض (متر)</th>
                        <th className="p-2.5 text-center w-20">ارتفاع/ضخامت</th>
                        <th className="p-2.5 text-center w-16">تعداد</th>
                        <th className="p-2.5 text-center w-24">واحد</th>
                        <th className="p-2.5 text-left w-32">فی واحد (تومان)</th>
                        <th className="p-2.5 text-center w-10">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 dark:divide-amber-950/40 font-bold">
                      {measurementRows.map((row) => (
                        <tr key={row.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              autoComplete="off"
                              value={row.title}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'title', e.target.value)}
                              placeholder="شرح کارکرد..."
                              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              value={row.length}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'length', e.target.value)}
                              placeholder="۰"
                              className="w-full h-9 px-2 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              value={row.width}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'width', e.target.value)}
                              placeholder="۰"
                              className="w-full h-9 px-2 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              value={row.height}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'height', e.target.value)}
                              placeholder="۰"
                              className="w-full h-9 px-2 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.count}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'count', e.target.value)}
                              placeholder="۱"
                              className="w-full h-9 px-2 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={row.unit}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'unit', e.target.value)}
                              className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                            >
                              <option value="مترمربع">مترمربع</option>
                              <option value="مترمکعب">مترمکعب</option>
                              <option value="مترطول">مترطول</option>
                              <option value="تن">تن</option>
                              <option value="عدد">عدد</option>
                              <option value="سرویس">سرویس</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.unitPrice ? Number(row.unitPrice.replace(/\D/g, '')).toLocaleString('fa-IR') : ''}
                              onChange={(e) => handleUpdateMeasurementRow(row.id, 'unitPrice', e.target.value.replace(/\D/g, ''))}
                              placeholder="۰"
                              className="w-full h-9 px-2 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteMeasurementRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* خلاصه زنده محاسبات متری */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span>مجموع حجم/متراژ محاسبه‌شده: <strong className="text-slate-900 dark:text-white font-mono">{metriCalculations.totalMetr.toLocaleString('fa-IR')}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">مبلغ کل قرارداد:</span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
                      {formatCurrency(metriCalculations.totalMetriPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* حالت ب: مدل پیمان مدیریت */}
            {pricingModel === 'PERCENTAGE_MANAGEMENT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      درصد مدیریت پیمان (%):
                    </label>
                    <input
                      type="number"
                      value={managementFeePercent}
                      onChange={(e) => setManagementFeePercent(Number(e.target.value))}
                      min={1}
                      max={50}
                      className="w-full h-11 px-3 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      برآورد اولیه کل هزینه‌های پروژه (تومان):
                    </label>
                    <input
                      type="text"
                      value={managementEstimatedCost ? managementEstimatedCost.toLocaleString('fa-IR') : ''}
                      onChange={(e) => setManagementEstimatedCost(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-full h-11 px-3 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      حق‌الزحمه برآوردی مدیریت (تومان):
                    </label>
                    <div className="w-full h-11 px-3 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono font-black text-amber-700 dark:text-amber-300 text-sm" dir="ltr">
                      {formatCurrency(computedManagementFee)}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 block">نحوه اعمال درصد مدیریت پیمان بر بخش‌ها:</span>
                  <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setApplyOnPurchases(!applyOnPurchases)}>
                      <AnimatedCheckbox checked={applyOnPurchases} onChange={() => setApplyOnPurchases(!applyOnPurchases)} theme="amber" />
                      <span>خرید مصالح و فاکتورها</span>
                    </div>

                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setApplyOnLabor(!applyOnLabor)}>
                      <AnimatedCheckbox checked={applyOnLabor} onChange={() => setApplyOnLabor(!applyOnLabor)} theme="amber" />
                      <span>دستمزد نیروی کار و استادکاران</span>
                    </div>

                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setApplyOnLogistics(!applyOnLogistics)}>
                      <AnimatedCheckbox checked={applyOnLogistics} onChange={() => setApplyOnLogistics(!applyOnLogistics)} theme="amber" />
                      <span>لجستیک، ماشین‌آلات و حمل‌ونقل</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* حالت ج: مقطوع / کنترات و تقسیط مراحل پرداخت */}
            {pricingModel === 'LUMPSUM_CONTRAT' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    مبلغ کل مقطوع قرارداد (تومان):
                  </label>
                  <input
                    type="text"
                    value={initialAmount ? initialAmount.toLocaleString('fa-IR') : ''}
                    onChange={(e) => setInitialAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="۰"
                    className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-lg text-slate-900 dark:text-white text-center"
                  />
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1 text-center">
                    به حروف: {numberToPersianWords(initialAmount)} تومان
                  </div>
                </div>

                {/* مراحل پرداخت درصدی */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      تقسیم‌بندی مراحل پرداخت بر اساس درصد پیشرفت فیزیکی:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {paymentStages.map((stg) => (
                      <div key={stg.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{stg.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-600">{stg.percentage}٪</span>
                          <span className="text-[10px] text-slate-400 font-mono">({formatCurrency((initialAmount * stg.percentage) / 100)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ۹. تاریخ‌های منعطف قرارداد */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              تنظیمات زمان‌بندی و مهلت اجرای قرارداد (منعطف):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* تاریخ شروع */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    تاریخ شروع قرارداد:
                  </label>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setHasStartDate(!hasStartDate)}>
                    <span className="text-[11px] font-bold text-slate-500">مشخص است</span>
                    <AnimatedCheckbox
                      checked={hasStartDate}
                      onChange={() => setHasStartDate(!hasStartDate)}
                      theme="amber"
                    />
                  </div>
                </div>

                {hasStartDate ? (
                  <GlassDatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="تاریخ شروع شمسی"
                  />
                ) : (
                  <div className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-xs font-bold text-slate-400">
                    آغاز عملیات از زمان ابلاغ کتبی (بدون قید تاریخ شروع تقویمی)
                  </div>
                )}
              </div>

              {/* تاریخ پایان */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    تاریخ پایان / سررسید اولیه:
                  </label>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setHasEndDate(!hasEndDate)}>
                    <span className="text-[11px] font-bold text-slate-500">مشخص است</span>
                    <AnimatedCheckbox
                      checked={hasEndDate}
                      onChange={() => setHasEndDate(!hasEndDate)}
                      theme="amber"
                    />
                  </div>
                </div>

                {hasEndDate ? (
                  <GlassDatePicker
                    value={initialEndDate}
                    onChange={(val) => setInitialEndDate(val)}
                    placeholder="تاریخ پایان شمسی"
                  />
                ) : (
                  <div className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-xs font-bold text-slate-400">
                    پروژه باز و ادامه‌دار (بدون تاریخ انقضا و سررسید مقید)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ۱۰. تنظیمات کسورات قانونی و سپرده حسن انجام کار */}
          <div className="p-5 rounded-3xl bg-amber-500/[0.04] border border-amber-500/20 space-y-4">
            <span className="text-xs font-black text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> کسورات قانونی، پیش‌پرداخت و حسن انجام کار:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  پیش‌پرداخت (تومان):
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={prepaymentAmount ? prepaymentAmount.toLocaleString('fa-IR') : ''}
                  onChange={(e) => setPrepaymentAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  placeholder="۰"
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  سپرده حسن انجام کار (%):
                </label>
                <input
                  type="number"
                  value={retentionPercent}
                  onChange={(e) => setRetentionPercent(Number(e.target.value))}
                  min={0}
                  max={50}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  تاریخ آزادسازی سپرده حسن انجام کار:
                </label>
                <GlassDatePicker
                  value={retentionReleaseDate}
                  onChange={(val) => setRetentionReleaseDate(val)}
                  placeholder="سررسید آزادسازی"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  بیمه تأمین اجتماعی (%):
                </label>
                <input
                  type="number"
                  value={insurancePercent}
                  onChange={(e) => setInsurancePercent(Number(e.target.value))}
                  min={0}
                  max={30}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  مالیات ارزش افزوده (%):
                </label>
                <input
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  min={0}
                  max={30}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                  جریمه تأخیر روزانه (تومان):
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={dailyDelayPenalty ? dailyDelayPenalty.toLocaleString('fa-IR') : ''}
                  onChange={(e) => setDailyDelayPenalty(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  placeholder="۰"
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* ۱۱. ثبت تضمین اولیه (چک صیادی یا سفته با آپلود تصویر) */}
          <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  const next = !hasInitialGuarantee;
                  setHasInitialGuarantee(next);
                  if (next && !guaranteeAmount) {
                    setGuaranteeAmount(initialAmount ? Math.round(initialAmount * 0.1) : 100000000);
                  }
                }}
              >
                <AnimatedCheckbox
                  checked={hasInitialGuarantee}
                  onChange={() => {
                    const next = !hasInitialGuarantee;
                    setHasInitialGuarantee(next);
                    if (next && !guaranteeAmount) {
                      setGuaranteeAmount(initialAmount ? Math.round(initialAmount * 0.1) : 100000000);
                    }
                  }}
                  theme="amber"
                />
                <Banknote className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  ثبت چک صیادی یا سفته ضمانت اولیه در زمان عقد قرارداد
                </span>
              </div>
            </div>

            {hasInitialGuarantee && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">نوع سند:</label>
                    <PortalSelect
                      options={[
                        { id: 'CHEQUE', label: 'چک صیادی بنفش' },
                        { id: 'PROMISSORY_NOTE', label: 'سفته حسن تعهدات' }
                      ]}
                      value={guaranteeType}
                      onChange={(val) => setGuaranteeType(val as any)}
                      className="!h-10 !rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">شناسه صیاد / سریال:</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={guaranteeSerial}
                      onChange={(e) => setGuaranteeSerial(e.target.value)}
                      placeholder="۱۶ رقم صیادی"
                      className="w-full h-10 px-3 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">مبلغ ضمانت (تومان):</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={guaranteeAmount ? guaranteeAmount.toLocaleString('fa-IR') : ''}
                      onChange={(e) => setGuaranteeAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      placeholder="۰"
                      className="w-full h-10 px-3 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">سررسید ضمانت:</label>
                    <GlassDatePicker
                      value={guaranteeDueDate}
                      onChange={(val) => setGuaranteeDueDate(val)}
                      placeholder="تاریخ سررسید"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">تصویر فیزیکی چک/سفته:</label>
                  <label className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-2 cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-amber-500" />
                    <span>{guaranteeImage ? 'تصویر بارگذاری شد ✓' : 'انتخاب فایل تصویر'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setGuaranteeImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ۱۲. موضوع و نشانی پروژه */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                موضوع دقیق قرارداد:
              </label>
              <textarea
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                rows={2}
                placeholder="شرح جزئیات فنی و عملیات اجرایی..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                محل اجرای پروژه / نشانی کارگاه:
              </label>
              <textarea
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                rows={2}
                placeholder="آدرس کارگاه، شهر و منطقه..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs resize-none"
              />
            </div>
          </div>

          {/* فوتر اکشن‌ها */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>{isEdit ? 'ذخیره تغییرات قرارداد' : 'ثبت قطعی قرارداد و صدور'}</span>
            </button>
          </div>
        </form>

        {/* مودال‌های اصلی ساخت سریع کارفرما، کارگر/استادکار و تأمین‌کننده */}
        <ClientFormModal
          isOpen={isQuickClientOpen}
          onClose={() => setIsQuickClientOpen(false)}
          onSuccess={(newClient) => {
            const fullName = `${newClient.name} ${newClient.lastName || ''}`.trim();
            setEmployers(prev => {
              const updated = [...prev];
              if (updated.length > 0 && !updated[0].name) {
                updated[0] = { 
                  id: newClient.id, 
                  name: fullName, 
                  phone: newClient.phone || '', 
                  nationalId: newClient.nationalId || '', 
                  address: newClient.address || '', 
                  isCustom: false 
                };
              } else {
                updated.push({ 
                  id: newClient.id, 
                  name: fullName, 
                  phone: newClient.phone || '', 
                  nationalId: newClient.nationalId || '', 
                  address: newClient.address || '', 
                  isCustom: false 
                });
              }
              return updated;
            });
            setPartyId(newClient.id);
            setPartyName(fullName);
            setPartyPhone(newClient.phone || '');
            setIsQuickClientOpen(false);
          }}
        />

        <LaborFormModal
          isOpen={isQuickWorkerOpen}
          onClose={() => setIsQuickWorkerOpen(false)}
          onSuccess={(newWorker: WorkerProfile) => {
            const fullName = `${newWorker.name} ${newWorker.lastName || ''}`.trim();
            setContractors(prev => [
              ...prev,
              { 
                id: newWorker.id, 
                name: fullName, 
                phone: newWorker.phone || '', 
                nationalId: newWorker.nationalId || '', 
                address: newWorker.address || '',
                role: newWorker.specialty || 'استادکار / مجری پروژه' 
              }
            ]);
            setPartyId(newWorker.id);
            setPartyName(fullName);
            setPartyPhone(newWorker.phone || '');
            setIsQuickWorkerOpen(false);
          }}
        />

        <SupplierModal
          isOpen={isQuickSupplierOpen}
          onClose={() => setIsQuickSupplierOpen(false)}
          onSuccess={(newSup: Supplier) => {
            setPartyId(newSup.id);
            setPartyName(newSup.name);
            setPartyPhone(newSup.phone || '');
            setIsQuickSupplierOpen(false);
          }}
        />
      </motion.div>
    </div>,
    portalTarget
  );
}
