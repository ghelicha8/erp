import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import moment from 'moment-jalaali';

// ==========================================
// 💡 ENUMS & TYPES
// ==========================================
export type PaymentType = 'DAILY' | 'HOURLY' | 'PIECE_WORK' | 'MONTHLY' | 'CONTRACT' | 'PROJECT_MONTHLY' | 'COMMISSION';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PAID_LEAVE' | 'UNPAID_LEAVE';
export type LaborRecordType = 'WAGE' | 'PERK' | 'OVERTIME';
export type WorkUnit = 'DAY' | 'HOUR' | 'METER' | 'ITEM' | 'MONTH' | 'PERCENTAGE' | 'FIXED' | 'SERVICE';
export type WorkerStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';

export type WeatherCondition = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'WINDY' | 'EXTREME' | 'NORMAL';

// ==========================================
// 💡 INTERFACES
// ==========================================

export interface SpecialtyTag {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; 
}

export interface PriceBookEntry {
  id: string;
  specialtyId: string;       
  paymentType: PaymentType;  
  workerUnit: WorkUnit;      
  billedUnit: WorkUnit;      
  workerRate: number;        
  billedRate: number;        
}

export interface IssuedTool {
  id: string;
  name: string;
  value: number; 
  issueDate: string;
  returnDate?: string;
  isLost: boolean; 
  notes?: string;
}

export interface LoanInstallment {
  id: string;
  totalAmount: number;      
  remainingAmount: number;  
  installmentAmount: number;
  isActive: boolean;        
  notes?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileUrl?: string;
  mimeType?: string;
  documentType: 'ID_CARD' | 'CONTRACT' | 'PROMISSORY_NOTE' | 'CERTIFICATE' | 'OTHER';
  uploadDate: string;
}

export interface LaborMonthlyContract {
  id: string;
  title: string;
  projectId: string | 'FREE';
  clientId: string | 'FREE';
  startDate: string;         
  endDate: string;           
  internalMonthlyWage: number; 
  billedMonthlyWage: number;   
  isActive: boolean;
}

export interface WorkerProfile {
  id: string;
  profilePhoto?: string;  
  name: string;        
  lastName: string;       
  nationalId?: string;    
  nationality?: string;   
  workPermitExpiry?: string; 
  
  phone1: string;         
  phone2: string;         
  insuranceCode?: string; 
  
  bloodType?: string;          
  emergencyContactName?: string; 
  emergencyContactPhone?: string;
  medicalNotes?: string;       

  specialtyIds: string[];  
  crewLeaderId: string | null; 
  
  status: WorkerStatus;
  statusNote?: string; 
  trustScore: number;  
  
  issuedTools: IssuedTool[];
  documents?: DocumentRecord[];

  maxAdvanceLimit?: number; 
  guaranteeRetained?: number; 
  loans?: LoanInstallment[];  
  
  activeContracts?: LaborMonthlyContract[];
  
  standardWorkHours: number; 
  defaultStartTime?: string; // 💡 اضافه شده برای تنظیمات پایه کارکرد
  defaultEndTime?: string;   // 💡 اضافه شده برای تنظیمات پایه کارکرد
  priceBook: PriceBookEntry[];

  defaultPaymentType: PaymentType;
  defaultBaseWage: number;    
  
  contractStartDate?: string; 
  contractEndDate?: string;   
  
  isPinned: boolean;      
  lastActiveDate: string; 
  
  createdAt: string;   
  updatedAt: string;   
}

export interface LaborLog {
  id: string;
  recordType: LaborRecordType; 
  contractId?: string; 
  
  projectId: string | 'FREE';
  clientId?: string | 'FREE';  
  phaseId?: string;
  
  splitDayGroupId?: string; 
  
  workerId: string;
  workerName: string; 
  date: string;

  startTime?: string;
  endTime?: string;
  
  specialtyId?: string;
  workType: string; 
  attendance: AttendanceStatus;
  paymentType: PaymentType;
  
  workerUnit: WorkUnit;
  workerQuantity: number;
  workerRate: number; 
  
  billedUnit: WorkUnit;
  billedQuantity: number;
  billedRate: number;
  
  isBilledAsFullDay?: boolean;

  appliedStandardWorkHours: number; 
  
  overtimeHours?: number;
  overtimeWage?: number; 
  overtimeMultiplier?: number; 

  reimbursableExpenses?: number; 
  bonus?: number; 
  penaltyDeduction?: number; 
  
  loanDeduction?: number;      
  guaranteeDeduction?: number; 
  
  qualityRating?: number; 

  internalCost: number; 
  billedCost: number;   
  
  hiddenProfit: number;
  systemArbitrageNote?: string; 
  
  advancePayment: number; 
  perkTitle?: string;   
  description?: string;

  weather?: WeatherCondition;           
  attachments?: string[];               
  voiceMemoUrl?: string;                
  
  issuedToolIds?: string[];             
  assignedVehicleId?: string;           
  
  hasIncident?: boolean;                
  incidentDescription?: string;         
  
  foodDeduction?: number;               

  isCoveredByUsMonthly?: boolean;       
  isCoveredByClientMonthly?: boolean;   
}

interface LaborState {
  specialtyTags: SpecialtyTag[];
  workers: WorkerProfile[];
  logs: LaborLog[];
  
  addSpecialtyTag: (tag: Omit<SpecialtyTag, 'id' | 'isSystem'>) => void;
  updateSpecialtyTag: (id: string, data: Partial<SpecialtyTag>) => void;
  deleteSpecialtyTag: (id: string) => void;

  addWorker: (data: Omit<WorkerProfile, 'id' | 'createdAt' | 'updatedAt' | 'isPinned' | 'lastActiveDate' | 'status' | 'trustScore' | 'issuedTools' | 'documents' | 'loans' | 'guaranteeRetained'>) => WorkerProfile;
  updateWorker: (id: string, data: Partial<WorkerProfile>) => void;
  removeWorkers: (ids: string[]) => void;
  togglePinWorker: (id: string) => void;
  
  addToolToWorker: (workerId: string, tool: Omit<IssuedTool, 'id'>) => void;
  updateWorkerTool: (workerId: string, toolId: string, data: Partial<IssuedTool>) => void;

  addDocumentToWorker: (workerId: string, doc: Omit<DocumentRecord, 'id' | 'uploadDate'>) => void;
  addLoanToWorker: (workerId: string, loan: Omit<LoanInstallment, 'id'>) => void;

  addLog: (log: Omit<LaborLog, 'id' | 'internalCost' | 'billedCost' | 'hiddenProfit' | 'recordType'> & { recordType?: LaborRecordType }) => void;
  addBulkLogs: (logs: (Omit<LaborLog, 'id' | 'internalCost' | 'billedCost' | 'hiddenProfit' | 'recordType'> & { recordType?: LaborRecordType })[]) => void; 
  updateLog: (id: string, data: Partial<Omit<LaborLog, 'id' | 'internalCost' | 'billedCost' | 'hiddenProfit'>>) => void;
  deleteLog: (id: string) => void;
  deleteMultipleLogs: (ids: string[]) => void;
}

// ==========================================
// 💡 PRE-FILLED MASTER DATA
// ==========================================
const DEFAULT_SPECIALTIES: SpecialtyTag[] = [
  { id: 'spec_1', name: 'بنای سفت‌کار', description: 'انجام امور مربوط به دیوارچینی، بلوک‌چینی، آجرکاری و اجرای ملات پایه.', isSystem: true },
  { id: 'spec_2', name: 'کارگر ساده', description: 'نیروی کارگری عمومی برای جابجایی مصالح، نظافت کارگاه و کمک به استادکاران.', isSystem: true },
  { id: 'spec_3', name: 'راننده پایه یک', description: 'راننده ماشین‌آلات سنگین، کمپرسی، تریلی و میکسر بتن.', isSystem: true },
  { id: 'spec_4', name: 'آرماتوربند', description: 'برش، خم‌کاری و بستن میلگردها بر اساس نقشه‌های سازه و فونداسیون.', isSystem: true },
  { id: 'spec_5', name: 'تاسیسات (لوله‌کش/برق‌کار)', description: 'اجرای لوله‌کشی آب و فاضلاب یا سیم‌کشی برق و داکت‌گذاری.', isSystem: true }
];

// ==========================================
// 💡 THE GOD-MODE CALCULATOR ENGINE
// ==========================================
const calculateFinancials = (log: Partial<LaborLog>) => {
  const rType = log.recordType || 'WAGE';
  const attendance = log.attendance || 'PRESENT';
  
  let internal = 0;
  let billed = 0;

  if (rType === 'PERK') {
    internal = (log.workerRate || 0) * (log.workerQuantity || 1);
    billed = (log.billedRate || 0) * (log.billedQuantity || 1);
  } 
  else if (attendance !== 'ABSENT' && attendance !== 'UNPAID_LEAVE') {
    if (log.paymentType === 'MONTHLY' && log.workerUnit === 'MONTH') {
       internal = Math.round(((log.workerRate || 0) / 30) * (log.workerQuantity || 1));
    } 
    else if (log.paymentType === 'HOURLY' && log.workerUnit === 'DAY') {
       const hourlyRate = (log.workerRate || 0) / (log.appliedStandardWorkHours || 8);
       internal = hourlyRate * (log.workerQuantity || 0);
    } 
    else {
       internal = (log.workerRate || 0) * (log.workerQuantity || 0);
    }

    if (log.paymentType === 'MONTHLY' && log.billedUnit === 'MONTH') {
      billed = Math.round(((log.billedRate || 0) / 30) * (log.billedQuantity || 1));
    }
    else if (log.paymentType === 'HOURLY' && log.billedUnit === 'DAY') {
      const hourlyBilledRate = (log.billedRate || 0) / (log.appliedStandardWorkHours || 8);
      billed = hourlyBilledRate * (log.billedQuantity || 0);
    }
    else {
      billed = (log.billedRate || 0) * (log.billedQuantity || 0);
    }
  }

  // صفر کردن پایه‌ها در صورت پوشش ماهانه
  if (log.isCoveredByUsMonthly) internal = 0;
  if (log.isCoveredByClientMonthly) billed = 0;

  // اعمال ضریب اضافه‌کاری و مزایا
  const multiplier = log.overtimeMultiplier || 1;
  const overtimeCost = (log.overtimeHours || 0) * (log.overtimeWage || 0) * multiplier;
  
  internal += overtimeCost + (log.reimbursableExpenses || 0) + (log.bonus || 0) - (log.penaltyDeduction || 0) - (log.foodDeduction || 0);
  billed += overtimeCost + (log.reimbursableExpenses || 0);

  const hiddenProfit = billed - internal;

  let systemNote = '';
  if (log.isBilledAsFullDay) {
    systemNote = '💰 آربیتراژ زمانی: کارکرد ساعتی/تیکه‌ای محاسبه شد اما برای کارفرما ۱ روز کامل فاکتور گردید.';
  } else if (log.isCoveredByUsMonthly && log.isCoveredByClientMonthly) {
    systemNote = 'ℹ️ این کارکرد کاملاً تحت پوشش قراردادهای ماهانه است.';
  } else if (log.isCoveredByUsMonthly && billed > 0) {
    systemNote = '💰 آربیتراژ خالص: کارگر حقوق ماهانه دارد اما این روز به عنوان فاکتور جدید برای کارفرما لحاظ شد.';
  } else if (log.isCoveredByClientMonthly && internal > 0) {
    systemNote = '⚠️ هشدار: کارفرما هزینه را ماهانه می‌دهد، اما شما بابت این کارکرد به نیرو دستمزد جداگانه پرداخت کردید.';
  } else if (hiddenProfit > 0) {
    if (log.splitDayGroupId) {
       systemNote = '💰 سود حاصل از جابه‌جایی شیفت / دوکاره بودن در یک روز (آربیتراژ زمانی).';
    } else if (log.workerUnit !== log.billedUnit) {
       systemNote = `💰 آربیتراژ واحدی: به نیروی کار (${log.workerUnit}) پرداخت شد اما برای کارفرما (${log.billedUnit}) فاکتور گردید.`;
    } else if (log.workerRate !== log.billedRate) {
       systemNote = '💰 سود پنهان ناشی از تفاوت نرخ پایه (تعرفه کارفرما بیشتر از دستمزد کارگر) است.';
    }
  } else if (hiddenProfit < 0) {
    systemNote = '⚠️ هشدار: در این رکورد شما در حال ضرر دادن هستید (پرداختی به نیرو بیشتر از دریافتی از کارفرماست).';
  }

  return { internalCost: internal, billedCost: billed, hiddenProfit, systemArbitrageNote: systemNote };
};

// ==========================================
// 💡 THE ZUSTAND STORE
// ==========================================
export const useLaborStore = create<LaborState>()(
  persist(
    (set, get) => ({
      specialtyTags: DEFAULT_SPECIALTIES,
      workers: [],
      logs: [],

      addSpecialtyTag: (tag) => set(state => ({
        specialtyTags: [...state.specialtyTags, { ...tag, id: `spec_${Date.now()}`, isSystem: false }]
      })),
      updateSpecialtyTag: (id, data) => set(state => ({
        specialtyTags: state.specialtyTags.map(t => t.id === id ? { ...t, ...data } : t)
      })),
      deleteSpecialtyTag: (id) => set(state => {
        const updatedWorkers = state.workers.map(w => ({
          ...w,
          specialtyIds: w.specialtyIds.filter(sId => sId !== id),
          priceBook: w.priceBook.filter(pb => pb.specialtyId !== id) 
        }));
        return { 
          specialtyTags: state.specialtyTags.filter(t => t.id !== id || t.isSystem),
          workers: updatedWorkers
        };
      }),

      addWorker: (data) => {
        const state = get();
        const now = moment().format('jYYYY/jMM/jDD');
        
        const newWorker: WorkerProfile = {
          ...data,
          id: crypto.randomUUID(),
          status: 'ACTIVE',
          trustScore: 5, 
          issuedTools: [],
          documents: [],
          loans: [],
          activeContracts: [], 
          guaranteeRetained: 0,
          standardWorkHours: data.standardWorkHours || 8, 
          priceBook: data.priceBook || [],
          isPinned: false,
          lastActiveDate: now,
          createdAt: now,
          updatedAt: now,
        };
        
        set({ workers: [newWorker, ...state.workers] });
        return newWorker;
      },

      updateWorker: (id, data) => set((state) => ({
        workers: state.workers.map((worker) => 
          worker.id === id ? { ...worker, ...data, updatedAt: moment().format('jYYYY/jMM/jDD') } : worker
        )
      })),

      removeWorkers: (ids) => set((state) => ({
        workers: state.workers.filter((worker) => !ids.includes(worker.id)),
        logs: state.logs.filter(log => !ids.includes(log.workerId)) 
      })),

      togglePinWorker: (id) => set((state) => ({
        workers: state.workers.map(w => w.id === id ? { ...w, isPinned: !w.isPinned } : w)
      })),

      addToolToWorker: (workerId, tool) => set((state) => ({
        workers: state.workers.map(w => 
          w.id === workerId ? { ...w, issuedTools: [...w.issuedTools, { ...tool, id: crypto.randomUUID() }] } : w
        )
      })),

      updateWorkerTool: (workerId, toolId, data) => set((state) => ({
        workers: state.workers.map(w => 
          w.id === workerId ? { 
            ...w, 
            issuedTools: w.issuedTools.map(t => t.id === toolId ? { ...t, ...data } : t) 
          } : w
        )
      })),

      addDocumentToWorker: (workerId, doc) => set((state) => ({
        workers: state.workers.map(w => 
          w.id === workerId ? { ...w, documents: [...(w.documents || []), { ...doc, id: crypto.randomUUID(), uploadDate: moment().format('jYYYY/jMM/jDD') }] } : w
        )
      })),

      addLoanToWorker: (workerId, loan) => set((state) => ({
        workers: state.workers.map(w => 
          w.id === workerId ? { ...w, loans: [...(w.loans || []), { ...loan, id: crypto.randomUUID(), isActive: true }] } : w
        )
      })),

      addLog: (log) => set((state) => {
        const financials = calculateFinancials(log);
        const newLog: LaborLog = { 
          ...log, 
          recordType: log.recordType || 'WAGE',
          id: crypto.randomUUID(), 
          ...financials 
        };
        
        const updatedWorkers = state.workers.map(w => w.id === log.workerId ? { ...w, lastActiveDate: log.date } : w);
        
        return { logs: [...state.logs, newLog], workers: updatedWorkers };
      }),

      addBulkLogs: (logsArray) => set((state) => {
        const newLogs = logsArray.map(log => {
          const financials = calculateFinancials(log);
          return {
            ...log,
            recordType: log.recordType || 'WAGE',
            id: crypto.randomUUID(),
            ...financials
          };
        });

        const latestDates: Record<string, string> = {};
        newLogs.forEach(l => {
           if (!latestDates[l.workerId] || l.date > latestDates[l.workerId]) {
              latestDates[l.workerId] = l.date;
           }
        });

        const updatedWorkers = state.workers.map(w => {
           if (latestDates[w.id] && latestDates[w.id] > (w.lastActiveDate || '')) {
              return { ...w, lastActiveDate: latestDates[w.id] };
           }
           return w;
        });

        return { logs: [...state.logs, ...newLogs], workers: updatedWorkers };
      }),

      updateLog: (id, data) => set((state) => ({
        logs: state.logs.map(log => {
          if (log.id === id) {
            const merged = { ...log, ...data };
            const financials = calculateFinancials(merged);
            return { ...merged, ...financials };
          }
          return log;
        })
      })),

      deleteLog: (id) => set((state) => ({
        logs: state.logs.filter(log => log.id !== id)
      })),

      deleteMultipleLogs: (ids) => set((state) => ({
        logs: state.logs.filter(log => !ids.includes(log.id))
      })),

    }),
    { name: 'erp-labor-storage' }
  )
);