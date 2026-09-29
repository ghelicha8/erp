import type { LaborRecord } from '../../../types/core.types';

export type ProjectStatus = 'IN_PROGRESS' | 'FINISHED' | 'PAUSED';
export type ContractType = 'CONTRAT' | 'METRI' | 'PERCENTAGE' | 'CUSTOM' | 'COST_ONLY';
export type PhaseStatus = 'IN_PROGRESS' | 'COMPLETED';

// ==========================================
// مدل‌های جدید برای خریدها و لجستیک (حسابداری دوگانه)
// ==========================================
export interface PurchaseRecord {
  id: string;
  projectId: string;
  phaseId?: string;
  source: 'MARKET' | 'INVENTORY'; // خرید آزاد یا از انبار خودمان
  title: string;                  // نام مصالح/کالا (مثال: سیمان تیپ ۲)
  vendor: string;                 // تامین کننده / مغازه
  date: string;
  quantity: number;
  unit: string;
  internalCost: number;           // قیمت تمام شده (واقعی) برای ما
  billedCost: number;             // قیمت فاکتور برای کارفرما
}

export interface LogisticsRecord {
  id: string;
  projectId: string;
  phaseId?: string;
  type: 'TRANSPORT' | 'EQUIPMENT'; // کرایه حمل بار یا اجاره موتوربرق/ابزار
  source: 'EXTERNAL' | 'INTERNAL'; // از بیرون اجاره شده یا ماشین/ابزار خود پیمانکار است
  title: string;                   // نوع بار یا نام ابزار
  provider: string;                // نام راننده یا مالک ابزار
  vehicleInfo?: string;            // پلاک یا مدل ماشین (اختیاری)
  date: string;
  internalCost: number;            // کرایه/اجاره واقعی پرداختی ما
  billedCost: number;              // کرایه/اجاره اعلامی به کارفرما
  driverWage?: number;             // سهم دستمزد راننده (اگر ماشین مال ماست و راننده درصدی کار میکند)
}

export interface Phase {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  contractType?: ContractType;
  photos: string[];
  financials: {
    expenditure: number;
  };
  
  // متغیرهای محاسباتی
  area?: number;                  
  unitPrice?: number;             
  contractorPercentage?: number;  
  fixedPrice?: number;            
  customFormulaId?: string;       
  phaseStatus?: PhaseStatus;      
  
  // ابعاد هندسی فاز (جدید)
  length?: number;
  width?: number;
  height?: number;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  startDate: string;
  status: ProjectStatus;
  photos: string[];
  profilePhoto?: string;
  phases: Phase[];
  financials: {
    totalExpenditure: number;
    estimatedProfit: number;
  };
  isPinned?: boolean;
  laborRecords: LaborRecord[];
  
  // 👈 آرایه‌های جدید به هسته پروژه اضافه شدند
  purchases?: PurchaseRecord[];
  logistics?: LogisticsRecord[];
}