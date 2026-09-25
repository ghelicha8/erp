import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShoppingCart, Store, PackageSearch, Truck, 
  User, HardHat, ChevronRight, ChevronLeft, CheckCircle, 
  Plus, Trash2, ArrowRight, ShieldCheck, Search, Banknote, 
  ChevronDown, Lock, Wallet, Users, Layers, AlertCircle, CheckSquare, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

import { useProjectStore } from '../store/projectStore';
import { useInventoryStore } from '../../../store/inventoryStore';
import { usePurchaseStore } from '../../../store/purchaseStore';
import { useLogisticsStore } from '../../../store/logisticsStore';
import { useLaborStore } from '../../../store/laborStore';
import GlassDatePicker from '../../../components/ui/GlassDatePicker';

const toEnglishDigits = (str: string) => {
  if (!str) return '';
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicNumbers  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '۹'];
  return str.split('').map(c => {
    let pIdx = persianNumbers.indexOf(c);
    if (pIdx >= 0) return pIdx;
    let aIdx = arabicNumbers.indexOf(c);
    if (aIdx >= 0) return aIdx;
    return c;
  }).join('');
};

const getTodayDate = () => {
  const d = new Date().toLocaleDateString('fa-IR');
  return toEnglishDigits(d).split('/').map(p => p.padStart(2, '0')).join('/');
};

function SearchableGlassSelect({ options, value, onChange, placeholder, icon: Icon, onAddNew, disabled }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: Math.max(rect.width, 300) });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleScrollOrResize = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedLabel = safeOptions.find((o: any) => o.value === value)?.label || placeholder;
  const isExactMatch = safeOptions.some((o: any) => o.label.toLowerCase() === searchTerm.toLowerCase());

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={openDropdown} 
        className={`w-full min-h-[46px] border rounded-2xl px-4 py-3 outline-none transition-all duration-300 flex items-center justify-between shadow-sm relative z-10
          ${disabled ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed' : 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500 dark:border-indigo-400' : ''}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className={`truncate text-sm font-bold ${value ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            {selectedLabel}
          </span>
        </div>
        {!disabled && <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />}
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0" style={{ zIndex: 2147483647 }} onClick={() => setIsOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: coords.top + 8, left: coords.left, width: coords.width }}
            className="backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col"
          >
            {onAddNew !== undefined && (
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-3 pr-9 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-colors shadow-inner" placeholder="جستجو..." />
                </div>
              </div>
            )}
            
            <div className="max-h-[220px] overflow-y-auto modal-scrollbar p-1.5">
              {filteredOptions.map((opt: any) => (
                <div 
                  key={opt.value} 
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }} 
                  className={`px-4 py-3 cursor-pointer text-sm font-bold rounded-xl transition-all duration-200 m-0.5
                    ${value === opt.value ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
                  `}
                >
                  {opt.label}
                  {opt.subLabel && <span className="block text-[10px] text-slate-400 mt-1">{opt.subLabel}</span>}
                </div>
              ))}
              {filteredOptions.length === 0 && !searchTerm && (
                <div className="p-4 text-center text-xs font-bold text-slate-400">موردی یافت نشد.</div>
              )}
              {searchTerm && !isExactMatch && onAddNew && (
                <button onClick={() => { setIsOpen(false); onAddNew(searchTerm); setSearchTerm(''); }} className="w-[calc(100%-8px)] m-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-black text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 animate-pulse">
                  <Plus className="w-4 h-4" /> افزودن: {searchTerm}
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function AdvancedPurchaseModal({ projectId: propProjectId }: { projectId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editId, setEditId] = useState<string | null>(null); 
  
  const allProjects = useProjectStore(state => state.projects);
  const [localProjectId, setLocalProjectId] = useState(propProjectId || '');
  const [lockedClientId, setLockedClientId] = useState<string | null>(null);
  
  const project = useMemo(() => allProjects.find(p => p.id === localProjectId), [allProjects, localProjectId]);

  const addLogisticsLog = useLogisticsStore(state => state.addLog);
  const addLaborLog = useLaborStore(state => state.addLog);
  const allWorkers = useLaborStore(state => state.workers); 
  const updateProject = useProjectStore(state => state.updateProject);

  const inventoryMaterials = useInventoryStore(state => state.materials) || [];
  const deductStock = useInventoryStore(state => state.deductStock);
  
  const addPurchase = usePurchaseStore(state => state.addPurchase);
  const deletePurchase = usePurchaseStore(state => state.deletePurchase);

  const mockVendors = [{ value: 'v1', label: 'آهن آلات برادران' }, { value: 'v2', label: 'سیمان سپاهان' }];
  const mockMarketMaterials = [{ value: 'm1', label: 'سیمان تیپ 2', units: ['پاکت', 'تن', 'فله'] }, { value: 'm2', label: 'میلگرد 16', units: ['شاخه', 'کیلوگرم', 'تن'] }];
  const mockMarketEquipments = [{ value: 'e1', label: 'اجاره موتور برق', units: ['روز', 'ساعت'] }, { value: 'e2', label: 'اجاره هیلتی', units: ['روز', 'ساعت'] }];
  
  const mockInternalDrivers = [{ value: 'id1', label: 'علی احمدی (پرسنل ثابت)' }];
  const mockExternalDrivers = [{ value: 'ed1', label: 'رضا کریمی (راننده عبوری)' }];
  const mockInternalVehicles = [{ value: 'vh1', label: 'نیسان آبی شرکت' }, { value: 'vh2', label: 'کامیون بنز شرکت' }];
  const mockExternalVehicles = [{ value: 'ev1', label: 'باربری تهران' }, { value: 'ev2', label: 'وانت آزاد (عبوری)' }];

  const [purchaseType, setPurchaseType] = useState<'MATERIAL' | 'EQUIPMENT'>('MATERIAL');
  const [source, setSource] = useState<'MARKET' | 'INVENTORY'>('MARKET');
  const [vendorName, setVendorName] = useState('');
  const [date, setDate] = useState('');
  const [phaseId, setPhaseId] = useState('GENERAL'); 
  
  const [items, setItems] = useState([{ id: Date.now().toString(), name: '', qty: 1, unit: 'عدد', internalCost: 0, billedCost: 0, availableUnits: ['عدد'] }]);
  
  const [needsTransport, setNeedsTransport] = useState(false);
  const [transportSource, setTransportSource] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [vehicleName, setVehicleName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transportInternalCost, setTransportInternalCost] = useState(0);
  const [transportBilledCost, setTransportBilledCost] = useState(0);
  const [driverWage, setDriverWage] = useState(0);
  const [isDriverWagePaid, setIsDriverWagePaid] = useState(false); 

  const [paymentIntent, setPaymentIntent] = useState<'DEBT' | 'PAY_NOW'>('DEBT');
  const [payer, setPayer] = useState<'CONTRACTOR' | 'CLIENT'>('CONTRACTOR');

  const activeInventoryList = inventoryMaterials.map((m: any) => ({ 
    value: m.id, label: m.name, basePrice: m.costPrice, unit: m.unit, availableUnits: [m.unit], subLabel: `موجودی: ${m.currentStock} ${m.unit}`
  }));
  const activeMarketList = purchaseType === 'MATERIAL' ? mockMarketMaterials : mockMarketEquipments;

  const clientProjects = useMemo(() => {
    if (lockedClientId) return allProjects.filter(p => p.clientId === lockedClientId);
    return allProjects;
  }, [allProjects, lockedClientId]);

  const projectOptions = clientProjects.map(p => ({ value: p.id, label: p.name }));

  const phaseOptions = useMemo(() => {
    return [
      { value: 'GENERAL', label: 'عمومی (بدون فاز مشخص)' },
      ...(project?.phases?.map((p: any) => ({ value: p.id, label: p.name })) || [])
    ];
  }, [project?.phases]);

  useEffect(() => {
    const handleOpen = (e: any) => {
      const editData = e.detail;
      setIsOpen(true);
      setStep(1);
      
      if (editData && editData.id) {
        setEditId(editData.id);
        
        setLocalProjectId(editData.projectId || propProjectId || '');
        setLockedClientId(null);

        setSource(editData.source || 'MARKET');
        setPhaseId(editData.phaseId || 'GENERAL');
        
        const existingVendor = mockVendors.find(v => v.label === editData.vendor) || mockVendors.find(v => v.value === editData.vendor);
        setVendorName(existingVendor ? existingVendor.value : editData.vendor || '');
        
        setDate(editData.date || getTodayDate());
        
        const existingItem = [...mockMarketMaterials, ...mockMarketEquipments].find(m => m.label === editData.title) || [...mockMarketMaterials, ...mockMarketEquipments].find(m => m.value === editData.title);
        
        setItems([{ 
          id: editData.id, 
          name: existingItem ? existingItem.value : editData.title, 
          qty: editData.quantity || 1, 
          unit: editData.unit || 'عدد', 
          internalCost: (editData.internalCost || 0) / (editData.quantity || 1), 
          billedCost: (editData.billedCost || 0) / (editData.quantity || 1), 
          availableUnits: [editData.unit || 'عدد'] 
        }]);

        if (editData.hasTransport) {
          setNeedsTransport(true);
          setTransportInternalCost(editData.transportInternalCost || 0);
          setTransportBilledCost(editData.transportBilledCost || 0);
          setTransportSource(editData.transportInternalCost === 0 ? 'INTERNAL' : 'EXTERNAL');
        } else {
          setNeedsTransport(false);
        }
        setIsDriverWagePaid(false); 

      } else {
        setEditId(null);

        if (editData && editData.preSelectedClientId) {
          setLockedClientId(editData.preSelectedClientId);
          setLocalProjectId('');
        } else {
          setLockedClientId(null);
          setLocalProjectId(propProjectId || '');
        }

        setDate(getTodayDate());
        setVendorName(''); 
        setPhaseId('GENERAL');
        setItems([{ id: Date.now().toString(), name: '', qty: 1, unit: 'عدد', internalCost: 0, billedCost: 0, availableUnits: ['عدد'] }]);
        setNeedsTransport(false); setVehicleName(''); setDriverName(''); setTransportInternalCost(0); setTransportBilledCost(0); setDriverWage(0);
        setPaymentIntent('DEBT'); setPayer('CONTRACTOR');
        setIsDriverWagePaid(false);
      }
    };
    document.addEventListener('open-new-purchase-modal', handleOpen);
    return () => document.removeEventListener('open-new-purchase-modal', handleOpen);
  }, [propProjectId]);

  const handleItemSelect = (index: number, val: string) => {
    const n = [...items];
    n[index].name = val;
    if (source === 'INVENTORY') {
      const selectedItem = activeInventoryList.find(i => i.value === val);
      if (selectedItem) {
        n[index].internalCost = selectedItem.basePrice; 
        n[index].unit = selectedItem.unit; 
        n[index].availableUnits = selectedItem.availableUnits;
      }
    } else {
      const selectedItem = activeMarketList.find(i => i.value === val);
      if (selectedItem) {
        n[index].availableUnits = selectedItem.units || ['عدد', 'کیلو', 'متر'];
        n[index].unit = n[index].availableUnits[0];
      } else {
        n[index].availableUnits = ['عدد', 'کیلو', 'متر', 'شاخه', 'پاکت', 'تن', 'مترمربع'];
        n[index].unit = 'عدد';
      }
    }
    setItems(n);
  };

  const handleCreateProfile = (type: string, name: string) => {
    toast.info(`پروفایل جدید برای "${name}" ثبت شد.`);
    if (type === 'vendor') setVendorName(name);
    if (type === 'driver') setDriverName(name);
    if (type === 'vehicle') setVehicleName(name);
  };

  const handleNext = () => {
    if (step === 1) {
      if ((!propProjectId || lockedClientId) && !localProjectId) return toast.error('لطفاً پروژه مرتبط با این فاکتور را انتخاب کنید.');
      if (source === 'MARKET' && !vendorName) return toast.error('لطفاً فروشگاه/تامین‌کننده را انتخاب کنید.');
      if (!date) return toast.error('تاریخ رویداد الزامی است.');
    }
    if (step === 2 && items.some(i => !i.name || i.internalCost <= 0)) return toast.error('لطفاً مشخصات کالا و قیمت خرید را کامل کنید.');
    setStep(s => s + 1);
  };

  const formatNum = (num: number) => num === 0 ? '' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const parseNum = (str: string) => Number(str.replace(/,/g, '')) || 0;

  const totalInternalItems = items.reduce((acc, i) => acc + (i.internalCost * i.qty), 0);
  const totalBilledItems = items.reduce((acc, i) => acc + ((i.billedCost > 0 ? i.billedCost : i.internalCost) * i.qty), 0);
  
  const actualTransportInternal = transportSource === 'INTERNAL' ? driverWage : transportInternalCost;
  const actualTransportBilled = transportBilledCost > 0 ? transportBilledCost : actualTransportInternal;
  
  const totalInternal = totalInternalItems + (needsTransport ? actualTransportInternal : 0);
  const totalBilled = totalBilledItems + (needsTransport ? actualTransportBilled : 0);

  const handleSave = () => {
    if (needsTransport) {
      if (!vehicleName) return toast.error('لطفاً مشخصات ماشین را وارد کنید.');
      if (transportSource === 'EXTERNAL' && transportInternalCost <= 0) return toast.error('کرایه ماشین آزاد نمی‌تواند صفر باشد.');
    }

    try {
      const finalVendor = source === 'INVENTORY' ? 'انبار مرکزی' : (mockVendors.find(v=>v.value===vendorName)?.label || vendorName);
      let newPurchaseIdForTransaction = '';

      if (editId) {
        deletePurchase(editId); 
      }

      items.forEach(item => {
        const itemNameLabel = source === 'INVENTORY' ? (activeInventoryList.find(i=>i.value===item.name)?.label || item.name) : (activeMarketList.find(i=>i.value===item.name)?.label || item.name);
        
        newPurchaseIdForTransaction = editId || crypto.randomUUID();

        addPurchase({ 
          id: newPurchaseIdForTransaction,
          projectId: localProjectId,
          clientId: project?.clientId,
          source, 
          phaseId: phaseId === 'GENERAL' ? undefined : phaseId,
          title: itemNameLabel, 
          vendor: finalVendor, 
          date, 
          quantity: item.qty, 
          unit: item.unit, 
          internalCost: item.internalCost * item.qty, 
          billedCost: item.billedCost > 0 ? (item.billedCost * item.qty) : (item.internalCost * item.qty),
          hasTransport: needsTransport,
          transportInternalCost: needsTransport ? actualTransportInternal : 0,
          transportBilledCost: needsTransport ? actualTransportBilled : 0
        } as any);

        if (purchaseType === 'MATERIAL' && !editId) {
           const currentInventory = project?.inventory || [];
           updateProject(localProjectId, {
              inventory: [...currentInventory, {
                 id: crypto.randomUUID(),
                 materialName: itemNameLabel,
                 quantity: item.qty,
                 unit: item.unit,
                 type: 'ENTER',
                 date: date,
                 reference: `خرید از ${finalVendor}`
              }]
           });
        }

        if (source === 'INVENTORY' && !editId) deductStock(item.name, item.qty);
      });

      if (needsTransport && !editId) {
        const driverList = transportSource === 'INTERNAL' ? mockInternalDrivers : mockExternalDrivers;
        const finalDriverName = driverList.find(d=>d.value===driverName)?.label || driverName || 'ناشناس';
        
        const vehicleList = transportSource === 'INTERNAL' ? mockInternalVehicles : mockExternalVehicles;
        const finalVehicleName = vehicleList.find(v=>v.value===vehicleName)?.label || vehicleName;

        addLogisticsLog({
          projectId: localProjectId, 
          type: 'TRANSPORT', 
          source: transportSource, 
          phaseId: phaseId === 'GENERAL' ? undefined : phaseId,
          title: `کرایه حمل (${finalVendor})`, 
          provider: finalDriverName, 
          vehicleInfo: finalVehicleName, 
          date, 
          internalCost: transportSource === 'INTERNAL' ? 0 : transportInternalCost, 
          billedCost: transportBilledCost > 0 ? transportBilledCost : (transportSource === 'INTERNAL' ? 0 : transportInternalCost), 
          driverWage: transportSource === 'INTERNAL' ? driverWage : 0 
        });
        
        if (transportSource === 'INTERNAL' && driverWage > 0) {
          const matchedDriver = allWorkers.find(w => `${w.name} ${w.lastName || ''}`.trim() === finalDriverName || w.name === driverName);
          if (matchedDriver) {
            addLaborLog({
              workerId: matchedDriver.id,
              workerName: `${matchedDriver.name} ${matchedDriver.lastName || ''}`.trim(),
              date,
              projectId: localProjectId || 'FREE',
              attendance: 'PRESENT',
              paymentType: 'DAILY',
              workerUnit: 'SERVICE',
              workerQuantity: 1,
              workerRate: driverWage,
              billedUnit: 'SERVICE',
              billedQuantity: 1,
              billedRate: 0,
              workType: 'راننده لجستیک',
              appliedStandardWorkHours: 8,
              advancePayment: isDriverWagePaid ? driverWage : 0,
              description: `حمل بار خرید از ${finalVendor}`,
            });
          }
        }
      }

      setIsOpen(false);
      toast.success(editId ? 'فاکتور ویرایش شد.' : 'فاکتور در هزینه‌ها و انبار ثبت شد.', { icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> });
      
      if (paymentIntent === 'PAY_NOW') {
        const transactionDetail = {
          id: crypto.randomUUID(), 
          linkedPurchaseId: newPurchaseIdForTransaction, 
          amount: totalBilled, 
          direction: payer === 'CONTRACTOR' ? 'OUT' : 'IN', 
          type: 'CASH',
          description: payer === 'CLIENT' ? `واریز مستقیم کارفرما بابت فاکتور ${finalVendor}` : `تسویه فاکتور خرید از ${finalVendor}`, 
          date: date,
        };

        setTimeout(() => { document.dispatchEvent(new CustomEvent('open-new-transaction-modal', { detail: transactionDetail })); }, 500);
      }
    } catch (error) { toast.error('خطا در ارتباط با دیتابیس!'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/50 dark:border-slate-700 shadow-2xl overflow-visible z-[100000]">
        
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 relative z-50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-pink-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">{editId ? 'ویرایش فاکتور خرید' : 'تدارکات پیشرفته و انبارداری'}</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">{editId ? 'اصلاح مقادیر و مبالغ' : 'ایجاد فاکتور خرید و ثبت هزینه پروژه'}</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="relative z-[999999] p-2 bg-white dark:bg-slate-800 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex items-center justify-between px-8 py-4 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto modal-scrollbar shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 relative z-10 w-full min-w-[80px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-colors duration-500 ${step >= i ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                {step > i ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              <span className={`text-[10px] font-bold text-center whitespace-nowrap ${step >= i ? 'text-pink-600 dark:text-pink-400' : 'text-slate-400'}`}>
                {i === 1 ? 'منبع و فاز' : i === 2 ? 'کالا و قیمت‌گذاری' : i === 3 ? 'لجستیک و حمل' : 'تایید بدهی / تسویه'}
              </span>
              {i < 4 && <div className={`absolute top-4 left-1/2 w-full h-1 -translate-y-1/2 -z-10 transition-colors duration-500 ${step > i ? 'bg-pink-500' : 'bg-slate-200 dark:bg-slate-800'}`} style={{ left: '-50%' }} />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 modal-scrollbar relative pb-32">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 pb-32 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">نوع کالا / خدمات</label>
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                      <button onClick={() => setPurchaseType('MATERIAL')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${purchaseType === 'MATERIAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-pink-600 shadow-sm' : 'text-slate-500'}`}>مصالح و مصرفی</button>
                      <button onClick={() => setPurchaseType('EQUIPMENT')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${purchaseType === 'EQUIPMENT' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-pink-600 shadow-sm' : 'text-slate-500'}`}>اجاره ابزار / دستگاه</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">منبع تامین</label>
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                      <button onClick={() => setSource('MARKET')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${source === 'MARKET' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Store className="w-4 h-4"/> بازار آزاد</button>
                      <button onClick={() => setSource('INVENTORY')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${source === 'INVENTORY' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}><PackageSearch className="w-4 h-4"/> انبار مرکزی</button>
                    </div>
                  </div>
                </div>

                <div className={`p-6 border rounded-2xl space-y-6 ${source === 'MARKET' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50'}`}>
                  <h4 className={`text-sm font-black flex items-center gap-2 ${source === 'MARKET' ? 'text-blue-800 dark:text-blue-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                    {source === 'MARKET' ? <><User className="w-4 h-4" /> انتخاب تامین‌کننده / فروشگاه</> : <><PackageSearch className="w-4 h-4" /> کسر مستقیم از انبار</>}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-50">
                    {source === 'MARKET' ? (
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">جستجوی پروفایل فروشگاه / شخص *</label>
                        <SearchableGlassSelect options={mockVendors} value={vendorName} onChange={setVendorName} placeholder="انتخاب پروفایل..." onAddNew={(val: string) => handleCreateProfile('vendor', val)} />
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col justify-center">
                        <div className="px-4 py-3.5 bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-bold text-center border border-emerald-200 dark:border-emerald-700">
                          سیستم ارزش اقلام را به طور هوشمند از انبار می‌خواند.
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 relative">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">تاریخ فاکتور / ثبت *</label>
                      <div className="h-[48px] w-full">
                         <GlassDatePicker value={date} onChange={setDate} />
                      </div>
                    </div>
                  </div>

                  {/* 💡 بخش انتخاب هوشمند پروژه و فاز */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-40 mt-4">
                    {(!propProjectId || lockedClientId) && (
                      <div className="space-y-2 relative z-50">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"><Briefcase className="w-4 h-4"/> پروژه مرتبط *</label>
                        <SearchableGlassSelect options={projectOptions} value={localProjectId} onChange={(val: string) => { setLocalProjectId(val); setPhaseId('GENERAL'); }} placeholder="انتخاب پروژه..." />
                      </div>
                    )}
                    <div className={`space-y-2 relative ${(!propProjectId || lockedClientId) ? 'z-40' : 'z-50'}`}>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"><Layers className="w-4 h-4"/> این خرید مربوط به کدام فاز است؟</label>
                      <SearchableGlassSelect options={phaseOptions} value={phaseId} onChange={setPhaseId} placeholder="انتخاب فاز..." disabled={(!propProjectId || lockedClientId) && !localProjectId} />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-48 pt-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl mb-4">
                  <span className="text-sm font-black text-amber-800 dark:text-amber-400 text-center sm:text-right">حسابداری دوگانه (Dual Ledger)</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-500 text-center sm:text-right">«قیمت کارفرما» را فقط اگر روی جنس سود می‌کشید، وارد کنید.</span>
                </div>

                {items.map((item, index) => (
                  <div key={item.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4 relative mt-6 transition-all duration-300">
                    
                    {items.length > 1 && (
                      <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="absolute -top-4 -left-3 p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors z-[100] shadow-[0_5px_15px_rgba(225,29,72,0.3)] hover:scale-105 active:scale-95"><Trash2 className="w-4 h-4"/></button>
                    )}
                    
                    <span className="absolute -right-3 -top-3 w-8 h-8 bg-pink-500 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-[0_5px_15px_rgba(236,72,153,0.3)] z-10">{index + 1}</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-4 relative z-50">
                      <div className="sm:col-span-6 space-y-2 relative">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">انتخاب {purchaseType === 'MATERIAL' ? 'مصالح' : 'ابزار'} *</label>
                        <SearchableGlassSelect 
                          options={source === 'INVENTORY' ? activeInventoryList : activeMarketList} 
                          value={item.name} 
                          onChange={(val: string) => handleItemSelect(index, val)} 
                          placeholder={source === 'INVENTORY' ? 'جستجو در انبار مرکزی...' : 'جستجو یا ثبت کالای جدید...'} 
                          onAddNew={source === 'MARKET' ? (val: string) => handleItemSelect(index, val) : null} 
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{purchaseType === 'EQUIPMENT' ? 'تایم (روز)' : 'تعداد'} *</label>
                        <input type="number" value={item.qty || ''} onChange={e => { const n = [...items]; n[index].qty = Number(e.target.value); setItems(n); }} className="w-full h-[46px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 outline-none text-center font-black text-indigo-600 dark:text-indigo-400 focus:border-indigo-500 transition-colors" dir="ltr" />
                      </div>
                      
                      <div className="sm:col-span-3 space-y-2 relative">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">واحد</label>
                        <SearchableGlassSelect 
                          options={item.availableUnits?.map((u: string) => ({label: u, value: u})) || []} 
                          value={item.unit} 
                          disabled={source === 'INVENTORY'}
                          onChange={(val: string) => { const n = [...items]; n[index].unit = val; setItems(n); }} 
                          placeholder="انتخاب واحد"
                        />
                      </div>
                      
                      <div className="sm:col-span-6 space-y-2 relative z-10">
                        <label className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">{source === 'INVENTORY' ? <><Lock className="w-3.5 h-3.5"/> ارزش دفتری از انبار (قفل)</> : 'قیمت واقعی خرید (فی) *'}</label>
                        <input 
                          disabled={source === 'INVENTORY'} 
                          value={formatNum(item.internalCost)} 
                          onChange={e => { const n = [...items]; n[index].internalCost = parseNum(e.target.value); setItems(n); }} 
                          className={`w-full h-[46px] border rounded-xl px-4 outline-none font-black dir-ltr focus:border-rose-500 transition-colors ${source === 'INVENTORY' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed text-left' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-left'}`} 
                          placeholder={source === 'INVENTORY' ? 'در انتظار انتخاب کالا...' : 'مبلغ پرداختی'} 
                        />
                      </div>
                      <div className="sm:col-span-6 space-y-2 z-10">
                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">قیمت برای کارفرما (فی)</label>
                        <input value={formatNum(item.billedCost)} onChange={e => { const n = [...items]; n[index].billedCost = parseNum(e.target.value); setItems(n); }} className="w-full h-[46px] bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 focus:border-emerald-500 transition-colors rounded-xl px-4 outline-none font-black text-emerald-600 dark:text-emerald-400 text-left" dir="ltr" placeholder="خالی = محاسبه بدون سود" />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button onClick={() => setItems([...items, { id: Date.now().toString(), name: '', qty: 1, unit: 'عدد', internalCost: 0, billedCost: 0, availableUnits: ['عدد'] }])} className="w-full py-4 border-2 border-dashed border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                  <Plus className="w-5 h-5" /> افزودن ردیف کالا / خدمات جدید
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 pb-48 pt-4 relative z-50">
                <div className="flex items-center justify-between p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                  <div>
                    <h3 className="text-base font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><Truck className="w-5 h-5"/> لجستیک و حمل و نقل</h3>
                    <p className="text-xs font-bold text-indigo-600/70 mt-1">آیا برای این تامین کالا، هزینه لجستیک در نظر گرفته شده؟</p>
                  </div>
                  <div onClick={() => setNeedsTransport(!needsTransport)} className={`w-14 h-7 rounded-full cursor-pointer relative transition-colors duration-300 shrink-0 shadow-inner border border-black/5 dark:border-white/5 ${needsTransport ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${needsTransport ? 'left-[3px]' : 'right-[3px]'}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {needsTransport && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-visible">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">مالکیت ناوگان باری</label>
                        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                          <button onClick={() => setTransportSource('EXTERNAL')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${transportSource === 'EXTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>کرایه ماشین عبوری (آزاد)</button>
                          <button onClick={() => setTransportSource('INTERNAL')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${transportSource === 'INTERNAL' ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>ناوگان اختصاصی پیمانکار</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-900/50 relative z-50">
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">پروفایل ماشین *</label>
                          <SearchableGlassSelect options={transportSource === 'INTERNAL' ? mockInternalVehicles : mockExternalVehicles} value={vehicleName} onChange={setVehicleName} placeholder={transportSource === 'INTERNAL' ? 'انتخاب ماشین شرکت...' : 'جستجوی باربری/ماشین...'} onAddNew={(val: string) => handleCreateProfile('vehicle', val)} />
                        </div>
                        <div className="space-y-2 relative z-40">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"><HardHat className="w-3.5 h-3.5"/> پروفایل راننده (اختیاری)</label>
                          <SearchableGlassSelect options={transportSource === 'INTERNAL' ? mockInternalDrivers : mockExternalDrivers} value={driverName} onChange={setDriverName} placeholder={transportSource === 'INTERNAL' ? 'انتخاب پرسنل...' : 'جستجوی راننده آزاد...'} onAddNew={(val: string) => handleCreateProfile('driver', val)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-2xl">
                        {transportSource === 'EXTERNAL' && (
                          <div className="sm:col-span-6 space-y-2">
                            <label className="text-xs font-bold text-rose-600 dark:text-rose-400">کرایه پرداختی به راننده آزاد *</label>
                            <input value={formatNum(transportInternalCost)} onChange={e => setTransportInternalCost(parseNum(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3 outline-none font-black text-rose-600 dark:text-rose-400 text-left" dir="ltr" />
                          </div>
                        )}
                        <div className={`space-y-2 ${transportSource === 'INTERNAL' ? 'sm:col-span-12' : 'sm:col-span-6'}`}>
                          <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">کرایه روی فاکتور کارفرما</label>
                          <input value={formatNum(transportBilledCost)} onChange={e => setTransportBilledCost(parseNum(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 outline-none font-black text-emerald-600 dark:text-emerald-400 text-left" dir="ltr" placeholder="مبلغی که از کارفرما دریافت میکنید" />
                        </div>
                        <AnimatePresence>
                          {transportSource === 'INTERNAL' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="sm:col-span-12 space-y-2 border-t border-amber-200/50 dark:border-amber-800/50 pt-4 mt-2">
                              <label className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">سهم راننده شما از این سرویس (دستمزد)</label>
                              <input value={formatNum(driverWage)} onChange={e => setDriverWage(parseNum(e.target.value))} className="w-full sm:w-1/2 bg-white dark:bg-slate-900 border border-fuchsia-200 dark:border-fuchsia-800/50 rounded-xl px-4 py-3 outline-none font-black text-fuchsia-600 dark:text-fuchsia-400 text-left" dir="ltr" placeholder="دستمزد سرویسی راننده..." />
                              
                              {driverWage > 0 && (
                                <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-4 cursor-pointer w-max p-2 rounded-lg hover:bg-fuchsia-500/10 transition-colors">
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isDriverWagePaid ? 'bg-fuchsia-500 border-fuchsia-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                    {isDriverWagePaid && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={isDriverWagePaid} onChange={e => setIsDriverWagePaid(e.target.checked)} />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تسویه دستمزد راننده در همین لحظه انجام شد (عدم ثبت بدهی)</span>
                                </motion.label>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-24">
                
                <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-slate-700">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/20 blur-3xl rounded-full pointer-events-none" />
                  <div className="space-y-4 relative z-10 font-mono text-sm">
                    <div className="flex justify-between items-center text-slate-300"><span>تعداد اقلام ({purchaseType === 'MATERIAL' ? 'کالا' : 'ابزار'}):</span> <span>{items.length} ردیف</span></div>
                    <div className="flex justify-between items-center text-slate-300"><span>مجموع هزینه اقلام (واقعی):</span> <span>{formatNum(totalInternalItems)}</span></div>
                    
                    {needsTransport && (
                      <div className="flex justify-between items-center text-amber-300 border-t border-slate-700 border-dashed pt-3">
                        <span>هزینه ناوگان و راننده (واقعی):</span> <span>{formatNum(actualTransportInternal)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-400 font-bold text-sm">مجموع هزینه واقعی (ارزش دفتری بدون سود):</span>
                        <span className="text-3xl font-black text-rose-400 drop-shadow-md" dir="ltr">{formatNum(totalInternal)}</span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                          <span>مبلغ نهایی فاکتور (ارائه به کارفرما همراه با سود):</span>
                          <span className="text-emerald-400 text-lg drop-shadow-md" dir="ltr">{formatNum(totalBilled)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-6 shadow-sm">
                  <h4 className="text-sm font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                    <Wallet className="w-5 h-5" /> وضعیت پرداختی فاکتور
                  </h4>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">آیا برای این فاکتور پولی پرداخت شده است؟</label>
                    <div className="flex p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                      <button onClick={() => setPaymentIntent('DEBT')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentIntent === 'DEBT' ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-200' : 'text-slate-500 hover:text-slate-700'}`}>خیر، تماماً بدهی است</button>
                      <button onClick={() => setPaymentIntent('PAY_NOW')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentIntent === 'PAY_NOW' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}>بله، پرداخت انجام شده</button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {paymentIntent === 'PAY_NOW' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden pt-4 border-t border-indigo-200/50 dark:border-indigo-800/50">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2"><Users className="w-4 h-4"/> این مبلغ را چه کسی حساب کرد؟</label>
                        <div className="flex p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                          <button onClick={() => setPayer('CONTRACTOR')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${payer === 'CONTRACTOR' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}><Wallet className="w-4 h-4"/> از جیب من (پیمانکار)</button>
                          <button onClick={() => setPayer('CLIENT')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${payer === 'CLIENT' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}><Banknote className="w-4 h-4"/> دریافت مستقیم از کارفرما</button>
                        </div>
                        
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                            <p>شما در مرحله بعد به فرم <b>تراکنش‌ها</b> منتقل می‌شوید.</p>
                            <ul className="list-disc pr-4 mt-1 space-y-1">
                              <li>می‌توانید مبلغ را برای پرداخت ناقص ویرایش کنید.</li>
                              <li>نوع پرداخت (نقد، چک، حواله) قابل انتخاب است.</li>
                              <li>سیستم به صورت خودکار جهت تراکنش را بر اساس انتخاب شما تنظیم می‌کند.</li>
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-4 shrink-0 relative z-[999] rounded-b-[2.5rem]">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
              <ChevronRight className="w-5 h-5" /> بازگشت
            </button>
          ) : <div />}
          
          {step < 4 ? (
            <button onClick={handleNext} className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
              مرحله بعدی <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={handleSave} className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-black hover:shadow-lg hover:shadow-pink-500/40 active:scale-95 transition-all">
              {paymentIntent === 'PAY_NOW' ? 'تایید و انتقال به تراکنش‌ها' : (editId ? 'ثبت تغییرات فاکتور' : 'ثبت بدهی به فروشنده')} <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}