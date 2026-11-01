import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import moment from 'moment-jalaali';
import { generateUUID } from '../core/utils/uuid';
import { useFinanceStore } from './financeStore';

// ---------------------------------------------------------
// 💡 اینترفیس‌های پایه‌ی پروفایل‌ها
// ---------------------------------------------------------
export type VehicleStatus = 'ACTIVE' | 'REPAIR' | 'INACTIVE';
export type ToolStatus = 'ACTIVE' | 'REPAIR' | 'RENTED' | 'UNAVAILABLE'; 

// ---------------------------------------------------------
// 💡 زیرسیستم تخصصی تعمیرات و استهلاک ماشین‌آلات
// ---------------------------------------------------------
export type RepairType = 
  | 'ENGINE_GEARBOX'       // موتور و گیربکس
  | 'HYDRAULIC'            // سیستم هیدرولیک
  | 'SUSPENSION_CHASSIS'   // تعلیق و زیربندی
  | 'ELECTRICAL'           // برق و الکترونیک
  | 'ACCIDENT'             // تصادف/سانحه کارگاهی
  | 'OVERHAUL';            // سرویس اساسی اورهال

export type DowntimeStatus = 
  | 'FULL_STOP'            // خواب کامل کارگاهی
  | 'LIGHT_LOAD'           // کارکرد با بار سبک/محدودیت
  | 'EMERGENCY_FIELD';     // تعمیر اضطراری سر صحنه پروژه

export type ScrapStatus = 
  | 'SCRAP'                // اسقاط انبار ضایعات
  | 'REPAIRABLE';          // قابل تراشکاری/بازسازی

export interface ReplacedPart {
  id: string;
  partName: string;
  partNumber?: string;
  scrapStatus: ScrapStatus;
  quantity?: number;
  unitCost?: number;
  cost?: number;
  [key: string]: any;
}

export interface MechanicInfo {
  mechanicType: 'INTERNAL' | 'EXTERNAL';
  mechanicName: string;
  mechanicPhone?: string;
  mechanicAddress?: string;
  supplierId?: string;
}

export interface VehicleRepairRecord {
  id: string;
  vehicleId: string;
  date: string;
  time?: string;
  repairType: RepairType;
  downtimeStatus: DowntimeStatus;
  replacedParts: ReplacedPart[];
  mechanicInfo: MechanicInfo;
  odometerOrHours: number;
  partsCost: number;
  wageCost: number;
  totalCost: number;
  description?: string;
  autoSendToFinance?: boolean;
  financeTransactionId?: string;
  settlementStatus?: SettlementStatus;
  paidAmount?: number;
  createdAt: string;
}

export const REPAIR_TYPE_LABELS: Record<RepairType, string> = {
  ENGINE_GEARBOX: 'موتور و گیربکس',
  HYDRAULIC: 'سیستم هیدرولیک',
  SUSPENSION_CHASSIS: 'تعلیق و زیربندی',
  ELECTRICAL: 'برق و الکترونیک',
  ACCIDENT: 'تصادف و سانحه کارگاهی',
  OVERHAUL: 'سرویس اساسی و اورهال',
};

export const DOWNTIME_STATUS_LABELS: Record<DowntimeStatus, string> = {
  FULL_STOP: 'خواب کامل کارگاهی',
  LIGHT_LOAD: 'کارکرد با بار سبک / محدودیت',
  EMERGENCY_FIELD: 'تعمیر اضطراری سر صحنه پروژه',
};

export const SCRAP_STATUS_LABELS: Record<ScrapStatus, string> = {
  SCRAP: 'اسقاط انبار ضایعات',
  REPAIRABLE: 'قابل تراشکاری و بازسازی',
};

// ---------------------------------------------------------
// 💡 زیرسیستم تخصصی بیمه و اقساط ناوگان
// ---------------------------------------------------------
export type InsuranceType = 'THIRD_PARTY' | 'BODY' | 'CIVIL_RESPONSIBILITY' | 'OTHER';
export type PaymentMode = 'LUMP_SUM' | 'INSTALLMENT';

export interface InsuranceInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;        // تاریخ سررسید قسط شمسی (YYYY/MM/DD)
  amount: number;         // مبلغ قسط (تومان)
  isPaid: boolean;        // وضعیت پرداخت قسط
  paidDate?: string;      // تاریخ پرداخت واقعی
  transactionId?: string; // شناسه سند مالی در صورت اتصال
}

export interface VehicleInsuranceRecord {
  id: string;
  vehicleId: string;
  insuranceType: InsuranceType;
  companyName: string;    // شرکت بیمه (ایران، آسیا، دانا، البرز و...)
  policyNumber: string;   // شماره بیمه‌نامه
  startDate: string;      // تاریخ صدور / آغاز
  endDate: string;        // تاریخ پایان اعتبار
  totalAmount: number;    // کل هزینه بیمه
  paymentMode: PaymentMode;
  installments: InsuranceInstallment[];
  status: 'ACTIVE' | 'EXPIRED' | 'NEAR_EXPIRY';
  notes?: string;
  createdAt: string;
  settlementStatus?: SettlementStatus;
  paidAmount?: number;
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  THIRD_PARTY: 'شخص ثالث',
  BODY: 'بیمه بدنه',
  CIVIL_RESPONSIBILITY: 'مسئولیت مدنی',
  OTHER: 'سایر بیمه‌ها',
};

export const INSURANCE_COMPANIES = [
  'بیمه ایران',
  'بیمه آسیا',
  'بیمه البرز',
  'بیمه دانا',
  'بیمه معلم',
  'بیمه پارسیان',
  'بیمه پاسارگاد',
  'بیمه کوثر',
  'بیمه کارآفرین',
  'بیمه رازی',
  'بیمه سامان',
  'سایر',
];

export interface VehicleProfile {
  id: string;
  name: string; 
  plate: string; 
  photo?: string; 
  status: VehicleStatus;
  insuranceDate?: string; 
  insuranceType?: string; 
  isPinned: boolean; 
  createdAt: string;
  odometerOrHours?: number;
  lastRepairDate?: string;
}

export interface ToolProfile {
  id: string;
  name: string; 
  serialNumber: string; 
  photo?: string; 
  serialPhoto?: string;
  purchaseDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  status: ToolStatus;
  isPinned: boolean; 
  createdAt: string;
}

// ---------------------------------------------------------
// 💡 اینترفیس ثبت لاگ‌های کارکرد
// ---------------------------------------------------------
export interface LogisticsLog {
  id: string;
  projectId: string | null; 
  phaseId?: string;
  type: 'TRANSPORT' | 'EQUIPMENT';
  source: 'INTERNAL' | 'EXTERNAL';
  title: string;
  provider: string; // ID راننده
  vehicleInfo: string; // ID ماشین
  date: string;
  internalCost: number;
  billedCost: number;
  driverWage: number;
  qty?: number; 
  unitPrice?: number; 
  settlementStatus?: SettlementStatus;
  paidAmount?: number;
}

// ---------------------------------------------------------
// 💡 زیرسیستم‌های هزینه‌های جانبی، خدمات دوره‌ای، رانندگان و اجاره ابزارآلات
// ---------------------------------------------------------
export type SettlementStatus = 'SETTLED' | 'PENDING' | 'PARTIAL'; // تسویه شده / مانده / نصفه
export type DriverWageType = 'PER_SERVICE' | 'MONTHLY' | 'WEEKLY' | 'DAILY';

export type ToolRentalUnit = 'HOURLY' | 'DAILY' | 'MONTHLY' | 'FIXED';

export const TOOL_RENTAL_UNIT_LABELS: Record<ToolRentalUnit, string> = {
  HOURLY: 'ساعتی',
  DAILY: 'روزانه',
  MONTHLY: 'ماهانه',
  FIXED: 'مقطوع / پروژه‌ای',
};

export interface ToolRentalRecord {
  id: string;
  toolId: string;
  startDate: string;
  endDate?: string;
  projectId?: string;
  clientId?: string;
  clientName?: string;
  rentalUnit: ToolRentalUnit;
  unitCount: number;
  unitPrice: number;
  totalAmount: number;
  settlementStatus: SettlementStatus;
  paidAmount?: number;
  hasOperator: boolean;
  operatorId?: string;
  operatorName?: string;
  operatorWageType?: 'HOURLY' | 'DAILY' | 'FIXED';
  operatorWageRate?: number;
  operatorTotalWage?: number;
  operatorPaid?: boolean;
  notes?: string;
  createdAt: string;
}

// مدل هزینه‌های جانبی
export interface VehicleMiscExpense {
  id: string;
  vehicleId: string;
  expenseType: string; // عوارض، سوخت، جریمه، کارواش، پارکینگ و...
  amount: number;
  date: string;
  settlementStatus: SettlementStatus;
  paidAmount?: number;
  description?: string;
  createdAt: string;
}

// مدل خدمات دوره‌ای (چند سرویس همزمان در یک تاریخ)
export interface PeriodicServiceItem {
  id: string;
  serviceType: string; // تعویض روغن، فیلتر هوا، لنت، روغن گیربکس و...
  cost: number;
  currentKm: number;
  nextDueKm?: number;
  nextDueDate?: string; // تاریخ سررسید بعدی (شمسی)
}

export interface VehiclePeriodicServiceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  currentOdometer: number;
  services: PeriodicServiceItem[];
  totalCost: number;
  settlementStatus: SettlementStatus;
  paidAmount?: number;
  notes?: string;
  createdAt: string;
}

// مدل انتساب و کارکرد رانندگان
export interface VehicleDriverAssignment {
  id: string;
  vehicleId: string;
  driverId: string; // آیدی راننده از laborStore
  driverName: string;
  wageType: DriverWageType;
  serviceCount: number; // تعداد سرویس باربری برده‌شده
  unitRate: number;     // نرخ به ازای هر سرویس
  totalWage: number;    // جمع کل دستمزد
  isPaid: boolean;
  assignedDate: string;
  notes?: string;
}

interface LogisticsState {
  logs: LogisticsLog[];
  vehicles: VehicleProfile[]; 
  tools: ToolProfile[];       
  toolRentals: ToolRentalRecord[];
  repairs: VehicleRepairRecord[];
  insurances: VehicleInsuranceRecord[];
  miscExpenses: VehicleMiscExpense[];
  periodicServices: VehiclePeriodicServiceRecord[];
  driverAssignments: VehicleDriverAssignment[];
  customInsuranceCompanies: string[];
  
  addLog: (log: Omit<LogisticsLog, 'id'>) => void;
  updateLog: (id: string, data: Partial<LogisticsLog>) => void;
  deleteLog: (id: string) => void;
  deleteMultipleLogs: (ids: string[]) => void;

  addVehicle: (vehicle: Omit<VehicleProfile, 'id' | 'createdAt'>) => void;
  updateVehicle: (id: string, data: Partial<VehicleProfile>) => void;
  deleteVehicle: (id: string) => void;
  toggleVehiclePin: (id: string) => void;

  addTool: (tool: Omit<ToolProfile, 'id' | 'createdAt'>) => void;
  updateTool: (id: string, data: Partial<ToolProfile>) => void;
  deleteTool: (id: string) => void;
  toggleToolPin: (id: string) => void;

  // اکشن‌های زیرسیستم تعمیرات
  addRepair: (repair: Omit<VehicleRepairRecord, 'id' | 'createdAt'>) => string;
  updateRepair: (id: string, data: Partial<VehicleRepairRecord>) => void;
  deleteRepair: (id: string) => void;

  // اکشن‌های زیرسیستم بیمه و اقساط
  addInsurance: (record: Omit<VehicleInsuranceRecord, 'id' | 'createdAt'>) => string;
  updateInsurance: (id: string, data: Partial<VehicleInsuranceRecord>) => void;
  deleteInsurance: (id: string) => void;
  toggleInstallmentPaid: (insuranceId: string, installmentId: string) => void;
  addInsuranceCompany: (name: string) => void;

  // اکشن‌های هزینه‌های جانبی
  addMiscExpense: (expense: Omit<VehicleMiscExpense, 'id' | 'createdAt'>) => string;
  updateMiscExpense: (id: string, data: Partial<VehicleMiscExpense>) => void;
  deleteMiscExpense: (id: string) => void;
  deleteMultipleMiscExpenses: (ids: string[]) => void;

  // اکشن‌های خدمات دوره‌ای
  addPeriodicService: (service: Omit<VehiclePeriodicServiceRecord, 'id' | 'createdAt'>) => string;
  updatePeriodicService: (id: string, data: Partial<VehiclePeriodicServiceRecord>) => void;
  deletePeriodicService: (id: string) => void;
  deleteMultiplePeriodicServices: (ids: string[]) => void;

  // اکشن‌های اجاره ابزارآلات
  addToolRental: (rental: Omit<ToolRentalRecord, 'id' | 'createdAt'>) => string;
  updateToolRental: (id: string, data: Partial<ToolRentalRecord>) => void;
  deleteToolRental: (id: string) => void;
  deleteMultipleToolRentals: (ids: string[]) => void;

  // اکشن‌های انتساب رانندگان
  assignDriver: (assignment: Omit<VehicleDriverAssignment, 'id'>) => string;
  updateDriverAssignment: (id: string, data: Partial<VehicleDriverAssignment>) => void;
  removeDriverAssignment: (id: string) => void;
}

export const useLogisticsStore = create<LogisticsState>()(
  persist(
    (set, get) => ({
      logs: [],
      vehicles: [],
      tools: [],
      toolRentals: [],
      repairs: [],
      insurances: [],
      miscExpenses: [],
      periodicServices: [],
      driverAssignments: [],
      customInsuranceCompanies: [],
      
      addLog: (log) => set((state) => ({
        logs: [{ ...log, id: generateUUID() }, ...state.logs]
      })),
      updateLog: (id, data) => set((state) => ({
        logs: state.logs.map(l => l.id === id ? { ...l, ...data } : l)
      })),
      deleteLog: (id) => set((state) => ({
        logs: state.logs.filter(l => l.id !== id)
      })),
      deleteMultipleLogs: (ids) => set((state) => ({
        logs: state.logs.filter(l => !ids.includes(l.id))
      })),

      addVehicle: (vehicle) => set((state) => ({
        vehicles: [{ ...vehicle, id: generateUUID(), createdAt: new Date().toISOString() }, ...state.vehicles]
      })),
      updateVehicle: (id, data) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...data } : v)
      })),
      deleteVehicle: (id) => set((state) => ({
        vehicles: state.vehicles.filter(v => v.id !== id),
        repairs: state.repairs.filter(r => r.vehicleId !== id),
        insurances: (state.insurances || []).filter(i => i.vehicleId !== id)
      })),
      toggleVehiclePin: (id) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, isPinned: !v.isPinned } : v)
      })),

      addTool: (tool) => set((state) => ({
        tools: [{ ...tool, id: generateUUID(), createdAt: new Date().toISOString() }, ...state.tools]
      })),
      updateTool: (id, data) => set((state) => ({
        tools: state.tools.map(t => t.id === id ? { ...t, ...data } : t)
      })),
      deleteTool: (id) => set((state) => ({
        tools: state.tools.filter(t => t.id !== id),
        toolRentals: (state.toolRentals || []).filter(r => r.toolId !== id),
        repairs: state.repairs.filter(r => r.vehicleId !== id),
        insurances: (state.insurances || []).filter(i => i.vehicleId !== id),
        miscExpenses: (state.miscExpenses || []).filter(m => m.vehicleId !== id),
        periodicServices: (state.periodicServices || []).filter(p => p.vehicleId !== id),
      })),
      toggleToolPin: (id) => set((state) => ({
        tools: state.tools.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t)
      })),

      addToolRental: (rental) => {
        const id = generateUUID();
        const newRecord: ToolRentalRecord = {
          ...rental,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          toolRentals: [newRecord, ...(state.toolRentals || [])]
        }));
        return id;
      },
      updateToolRental: (id, data) => set((state) => ({
        toolRentals: (state.toolRentals || []).map(r => r.id === id ? { ...r, ...data } : r)
      })),
      deleteToolRental: (id) => set((state) => ({
        toolRentals: (state.toolRentals || []).filter(r => r.id !== id)
      })),
      deleteMultipleToolRentals: (ids) => set((state) => ({
        toolRentals: (state.toolRentals || []).filter(r => !ids.includes(r.id))
      })),

      // مدیریت رکورد تعمیرات با ارسال اتوماتیک سند به financeStore
      addRepair: (repairData) => {
        const repairId = generateUUID();
        let financeTxId: string | undefined = undefined;

        if (repairData.autoSendToFinance && repairData.totalCost > 0) {
          try {
            const vehicle = get().vehicles.find(v => v.id === repairData.vehicleId);
            const tool = get().tools.find(t => t.id === repairData.vehicleId);
            const assetName = vehicle?.name || tool?.name || 'خودرو / دستگاه';
            const repairTypeTitle = REPAIR_TYPE_LABELS[repairData.repairType] || 'تعمیرات';
            
            financeTxId = generateUUID();
            useFinanceStore.getState().addTransaction({
              referenceId: repairData.vehicleId,
              direction: 'OUT',
              type: 'CASH',
              amount: repairData.totalCost,
              date: repairData.date,
              description: `هزینه تعمیر و نگهداری ناوگان - ${assetName} (${repairTypeTitle})`,
            });
          } catch (err) {
            console.error('Failed to sync repair with financeStore', err);
          }
        }

        const newRecord: VehicleRepairRecord = {
          ...repairData,
          id: repairId,
          financeTransactionId: financeTxId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          repairs: [newRecord, ...(state.repairs || [])],
          vehicles: state.vehicles.map(v => {
            if (v.id === repairData.vehicleId) {
              return {
                ...v,
                status: repairData.downtimeStatus === 'FULL_STOP' ? 'REPAIR' : v.status,
                odometerOrHours: repairData.odometerOrHours || v.odometerOrHours,
                lastRepairDate: repairData.date,
              };
            }
            return v;
          }),
          tools: state.tools.map(t => {
            if (t.id === repairData.vehicleId) {
              return {
                ...t,
                status: repairData.downtimeStatus === 'FULL_STOP' ? 'REPAIR' : t.status,
              };
            }
            return t;
          })
        }));

        return repairId;
      },

      updateRepair: (id, data) => set((state) => ({
        repairs: state.repairs.map(r => r.id === id ? { ...r, ...data } : r)
      })),

      deleteRepair: (id) => set((state) => {
        const target = state.repairs.find(r => r.id === id);
        if (target?.financeTransactionId) {
          try {
            useFinanceStore.getState().deleteTransaction(target.financeTransactionId);
          } catch (e) {
            // ignore
          }
        }
        return {
          repairs: state.repairs.filter(r => r.id !== id)
        };
      }),

      // =========================================================
      // اکشن‌های زیرسیستم بیمه و اقساط ناوگان
      // =========================================================
      addInsurance: (record) => {
        const newId = generateUUID();
        const newRecord: VehicleInsuranceRecord = {
          ...record,
          id: newId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          insurances: [newRecord, ...(state.insurances || [])],
          vehicles: state.vehicles.map(v => {
            if (v.id === record.vehicleId) {
              return {
                ...v,
                insuranceDate: record.endDate,
                insuranceType: INSURANCE_TYPE_LABELS[record.insuranceType] || record.insuranceType,
              };
            }
            return v;
          })
        }));

        return newId;
      },

      updateInsurance: (id, data) => set((state) => {
        const updated = (state.insurances || []).map(ins => ins.id === id ? { ...ins, ...data } : ins);
        const target = updated.find(i => i.id === id);

        return {
          insurances: updated,
          vehicles: target ? state.vehicles.map(v => {
            if (v.id === target.vehicleId && data.endDate) {
              return {
                ...v,
                insuranceDate: data.endDate,
                insuranceType: data.insuranceType ? (INSURANCE_TYPE_LABELS[data.insuranceType] || data.insuranceType) : v.insuranceType,
              };
            }
            return v;
          }) : state.vehicles,
        };
      }),

      deleteInsurance: (id) => set((state) => ({
        insurances: (state.insurances || []).filter(ins => ins.id !== id)
      })),

      toggleInstallmentPaid: (insuranceId, installmentId) => set((state) => ({
        insurances: (state.insurances || []).map(ins => {
          if (ins.id !== insuranceId) return ins;
          return {
            ...ins,
            installments: ins.installments.map(inst => {
              if (inst.id !== installmentId) return inst;
              const nextPaid = !inst.isPaid;
              return {
                ...inst,
                isPaid: nextPaid,
                paidDate: nextPaid ? moment().format('jYYYY/jMM/jDD') : undefined,
              };
            })
          };
        })
      })),

      addInsuranceCompany: (name) => set((state) => {
        const trimmed = name.trim();
        if (!trimmed || (state.customInsuranceCompanies || []).includes(trimmed)) return state;
        return {
          customInsuranceCompanies: [...(state.customInsuranceCompanies || []), trimmed]
        };
      }),

      // اکشن‌های هزینه‌های جانبی
      addMiscExpense: (expense) => {
        const id = generateUUID();
        const newRecord: VehicleMiscExpense = {
          ...expense,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          miscExpenses: [newRecord, ...(state.miscExpenses || [])]
        }));
        return id;
      },

      updateMiscExpense: (id, data) => set((state) => ({
        miscExpenses: (state.miscExpenses || []).map(m => m.id === id ? { ...m, ...data } : m)
      })),

      deleteMiscExpense: (id) => set((state) => ({
        miscExpenses: (state.miscExpenses || []).filter(m => m.id !== id)
      })),

      deleteMultipleMiscExpenses: (ids) => set((state) => ({
        miscExpenses: (state.miscExpenses || []).filter(m => !ids.includes(m.id))
      })),

      // اکشن‌های خدمات دوره‌ای
      addPeriodicService: (service) => {
        const id = generateUUID();
        const newRecord: VehiclePeriodicServiceRecord = {
          ...service,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          periodicServices: [newRecord, ...(state.periodicServices || [])],
          vehicles: state.vehicles.map(v => {
            if (v.id === service.vehicleId && service.currentOdometer) {
              return {
                ...v,
                odometerOrHours: Math.max(v.odometerOrHours || 0, service.currentOdometer)
              };
            }
            return v;
          })
        }));
        return id;
      },

      updatePeriodicService: (id, data) => set((state) => ({
        periodicServices: (state.periodicServices || []).map(p => p.id === id ? { ...p, ...data } : p)
      })),

      deletePeriodicService: (id) => set((state) => ({
        periodicServices: (state.periodicServices || []).filter(p => p.id !== id)
      })),

      deleteMultiplePeriodicServices: (ids) => set((state) => ({
        periodicServices: (state.periodicServices || []).filter(p => !ids.includes(p.id))
      })),

      // اکشن‌های انتساب رانندگان
      assignDriver: (assignment) => {
        const id = generateUUID();
        const newRecord: VehicleDriverAssignment = {
          ...assignment,
          id,
        };
        set((state) => ({
          driverAssignments: [newRecord, ...(state.driverAssignments || [])]
        }));
        return id;
      },

      updateDriverAssignment: (id, data) => set((state) => ({
        driverAssignments: (state.driverAssignments || []).map(d => d.id === id ? { ...d, ...data } : d)
      })),

      removeDriverAssignment: (id) => set((state) => ({
        driverAssignments: (state.driverAssignments || []).filter(d => d.id !== id)
      })),
    }),
    { name: 'logistics-storage' }
  )
);

// ---------------------------------------------------------
// 💡 موتور هوشمند محاسبه و تخصیص دستمزد رانندگان خودرو
// ---------------------------------------------------------
export interface SmartDriverCostItem {
  driverId: string;
  driverName: string;
  wageType: DriverWageType;
  amount: number;
  description: string;
  mergedLogsCount?: number;
}

export interface SmartDriverCostResult {
  totalDriverCost: number;
  perServiceCost: number;
  dailyCost: number;
  monthlyCost: number;
  breakdown: SmartDriverCostItem[];
}

export const calculateSmartDriverCostForVehicle = (
  vehicleId: string,
  options?: { dateFrom?: string; dateTo?: string }
): SmartDriverCostResult => {
  const state = useLogisticsStore.getState();
  const assignments = (state.driverAssignments || []).filter(a => a.vehicleId === vehicleId);
  const vehicleLogs = (state.logs || []).filter(l => 
    l.vehicleInfo === vehicleId && 
    l.type === 'TRANSPORT' &&
    (!options?.dateFrom || (l.date || '') >= options.dateFrom) &&
    (!options?.dateTo || (l.date || '') <= options.dateTo)
  );

  let perServiceCost = 0;
  let dailyCost = 0;
  let monthlyCost = 0;
  const breakdown: SmartDriverCostItem[] = [];

  // ۱. پردازش رانندگان با قرارداد سرویسی (PER_SERVICE)
  assignments.filter(a => a.wageType === 'PER_SERVICE').forEach(a => {
    const relatedLogs = vehicleLogs.filter(l => l.provider === a.driverId);
    const serviceCount = relatedLogs.length > 0 
      ? relatedLogs.reduce((sum, l) => sum + (l.qty || 1), 0)
      : (a.serviceCount || 0);
    const cost = a.unitRate > 0 ? serviceCount * a.unitRate : (a.totalWage || 0);
    if (cost > 0) {
      perServiceCost += cost;
      breakdown.push({
        driverId: a.driverId,
        driverName: a.driverName,
        wageType: 'PER_SERVICE',
        amount: cost,
        description: `${serviceCount} سرویس باربری با نرخ ${a.unitRate.toLocaleString('fa-IR')} تومان`,
      });
    }
  });

  // ۲. پردازش رانندگان روزمزد (DAILY) - ادغام لاگ‌های چندگانه در یک روز
  assignments.filter(a => a.wageType === 'DAILY').forEach(a => {
    const dailyRate = a.unitRate > 0 ? a.unitRate : (a.totalWage || 0);
    const relatedLogs = vehicleLogs.filter(l => l.provider === a.driverId);
    
    // گروه‌بندی لاگ‌ها بر اساس تاریخ شمسی
    const logsByDate = new Map<string, typeof relatedLogs>();
    relatedLogs.forEach(l => {
      const d = l.date || 'نامشخص';
      if (!logsByDate.has(d)) logsByDate.set(d, []);
      logsByDate.get(d)!.push(l);
    });

    let driverDailyTotal = 0;
    let mergedDays = 0;
    logsByDate.forEach((dayLogs) => {
      // فقط یکبار دستمزد روزانه برای این تاریخ منظور می‌شود
      driverDailyTotal += dailyRate;
      if (dayLogs.length > 1) {
        mergedDays += (dayLogs.length - 1);
      }
    });

    if (driverDailyTotal > 0 || logsByDate.size > 0) {
      dailyCost += driverDailyTotal;
      breakdown.push({
        driverId: a.driverId,
        driverName: a.driverName,
        wageType: 'DAILY',
        amount: driverDailyTotal,
        description: `${logsByDate.size} روز کاری (${mergedDays} لاگ هم‌روز به عنوان یک شیفت ادغام شد)`,
        mergedLogsCount: mergedDays,
      });
    }
  });

  // ۳. پردازش رانندگان حقوق ماهانه (MONTHLY / WEEKLY) - تنها یکبار اعمال در هر ماه جلالی
  assignments.filter(a => a.wageType === 'MONTHLY' || a.wageType === 'WEEKLY').forEach(a => {
    const relatedLogs = vehicleLogs.filter(l => l.provider === a.driverId);
    const uniqueJalaliMonths = new Set<string>();
    relatedLogs.forEach(l => {
      if (l.date && l.date.length >= 7) {
        uniqueJalaliMonths.add(l.date.substring(0, 7)); // مثلا "1403/07"
      }
    });

    const monthsCount = Math.max(uniqueJalaliMonths.size, 1);
    const monthlyRate = a.unitRate > 0 ? a.unitRate : (a.totalWage || 0);
    const driverMonthlyTotal = monthlyRate * monthsCount;

    if (driverMonthlyTotal > 0) {
      monthlyCost += driverMonthlyTotal;
      breakdown.push({
        driverId: a.driverId,
        driverName: a.driverName,
        wageType: a.wageType,
        amount: driverMonthlyTotal,
        description: `حقوق ثابت برای ${monthsCount} ماه جلالی فعالیت ناوگان (${Array.from(uniqueJalaliMonths).join('، ') || 'ماه جاری'})`,
      });
    }
  });

  const totalDriverCost = perServiceCost + dailyCost + monthlyCost;
  return {
    totalDriverCost,
    perServiceCost,
    dailyCost,
    monthlyCost,
    breakdown,
  };
};