import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateUUID } from '../core/utils/uuid';
import { useProjectStore } from '../features/projects/store/projectStore';
import { useAlertStore } from './useAlertStore';
import moment from 'moment-jalaali';

// ============================================================================
// ۱. تایپ‌ها و اینترفیس‌های جامع ماژول قراردادها
// ============================================================================

export type ContractCategory = 
  | 'CLIENT_PROJECT'       // قرارداد اجرای پروژه با کارفرما / مشتری (درآمدی)
  | 'SUBCONTRACTOR_LABOR'   // قرارداد با پیمانکار فرعی / استادکار / اکیپ (هزینه‌ای)
  | 'EQUIPMENT_RENTAL'     // قرارداد اجاره خودرو یا ابزارآلات (اجاره دادن یا گرفتن)
  | 'MATERIAL_SUPPLY';     // قرارداد تأمین مصالح با بنکدار / معدن / تدارکات

export type PricingModel = 
  | 'LUMPSUM_CONTRAT'      // مقطوع / کنترات
  | 'METRI_UNIT'           // متری / بر اساس واحد اندازه‌گیری
  | 'PERCENTAGE_MANAGEMENT'// پیمان مدیریت (درصدی)
  | 'COST_PLUS'            // هزینه تمام‌شده به علاوه کارمزد
  | 'HYBRID_PHASED';       // ترکیبی فازبه‌فاز

export type ContractStatus = 
  | 'DRAFT'                // پیش‌نویس
  | 'ACTIVE'               // در حال اجرا / فعال
  | 'COMPLETED'            // تکمیل و تسویه شده
  | 'SUSPENDED'            // متوقف / تعلیق
  | 'TERMINATED';          // فسخ شده

export type GuaranteeType = 
  | 'CHEQUE'               // چک صیادی
  | 'PROMISSORY_NOTE'      // سفته
  | 'BANK_GUARANTEE'       // ضمانت‌نامه بانکی
  | 'CASH'                 // وجه نقد / ودیعه
  | 'OTHER';               // سایر

export type GuaranteeStatus = 
  | 'HELD'                 // نزد طرف حساب / نزد ما
  | 'RELEASED'             // آزاد و مسترد شده
  | 'EXECUTED';            // به اجرا گذاشته شده

export interface ContractGuarantee {
  id: string;
  contractId: string;
  type: GuaranteeType;
  serialNumber: string;    // شماره صیاد ۱۶ رقمی یا شماره سند
  bankName?: string;
  amount: number;
  dueDate: string;         // تاریخ سررسید
  issueDate?: string;
  issuerName?: string;
  receiverName?: string;
  direction: 'GIVEN' | 'RECEIVED'; // ما تحویل دادیم یا دریافت کردیم
  status: GuaranteeStatus;
  releaseDate?: string;
  image?: string;
  description?: string;
}

export interface ContractAddendum {
  id: string;
  contractId: string;
  number: number;          // شماره الحاقیه (۱، ۲، ...)
  title: string;           // عنوان متمم
  date: string;            // تاریخ انعقاد متمم
  amountDelta: number;     // تغییر مبلغ (+ یا -)
  quantityDelta?: number;  // تغییر متراژ / احجام
  newEndDate?: string;     // تمدید تاریخ پایان
  description: string;     // شرح دلایل الحاقیه
  attachments?: string[];  // تصاویر مدارک متمم
}

export interface ContractMeasurementItem {
  id: string;
  contractId: string;
  phaseId?: string;
  rowNumber: number;
  description: string;     // شرح ردیف (مثلاً تیغه‌چینی سفال ۱۵ سانتی)
  unit: string;            // واحد (مترمربع، مترمکعب، مترطول، تن، عدد، ...)
  length?: number;         // طول
  width?: number;          // عرض
  height?: number;         // ارتفاع / ضخامت
  count?: number;          // تعداد
  factor?: number;         // ضریب (پیش‌فرض ۱)
  quantity: number;        // مقدار کل محاسبه‌شده یا دستی
  unitPrice: number;       // بهای واحد
  totalPrice: number;      // مبلغ کل ردیف
  completedQuantity?: number; // مقدار کارکرد محقق‌شده
  notes?: string;
}

export interface ContractPhase {
  id: string;
  contractId: string;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  pricingModel?: PricingModel;
  weightPercentage?: number; // وزن فاز از کل قرارداد (درصد)
  estimatedAmount: number;
  certifiedAmount?: number;
  startDate?: string;
  endDate?: string;
  progressPercentage: number;
}

export interface ContractAttachment {
  id: string;
  contractId: string;
  title: string;
  type: 'IMAGE' | 'PDF' | 'DOCUMENT';
  url: string;
  date: string;
  size?: string;
}

export interface ContractParty {
  id: string;
  name: string;
  nationalId?: string;
  phone?: string;
  address?: string;
  role?: string;
}

export interface ContractWitness {
  id: string;
  name: string;
  nationalId?: string;
  phone?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;    // شماره قرارداد (مثلاً CNT-1403-010)
  title: string;             // عنوان قرارداد
  category: ContractCategory;
  pricingModel: PricingModel;
  status: ContractStatus;
  isPinned?: boolean;

  // اتصالات شبکه عنکبوتی
  projectId?: string;
  projectName?: string;
  partyType: 'CLIENT' | 'WORKER' | 'SUPPLIER' | 'EQUIPMENT_OWNER' | 'OTHER';
  partyId?: string;
  partyName: string;         // طرف حساب اصلی
  partyPhone?: string;
  rentalDirection?: 'RENT_IN' | 'RENT_OUT'; // برای اجاره ابزار و ماشین
  equipmentId?: string;
  equipmentType?: 'VEHICLE' | 'TOOL';

  // کارفرمایان و مشتریان (چندگانه)
  employers?: ContractParty[];

  // مشخصات شرکت / برند پیمانکاری و مجریان/پیمانکاران (چندگانه)
  contractorCompany?: string; // نام شرکت یا برند پیمانکاری
  companyBrandName?: string; // برند یا نام شرکت پیمانکاری
  contractors?: ContractParty[];

  // شاهدین قرارداد (چندگانه)
  witnesses?: ContractWitness[];

  // فازبندی و حوزه شمول قرارداد در پروژه
  scopeType?: 'WHOLE_PROJECT' | 'SPECIFIC_PHASE'; // کل پروژه یا فاز مشخص
  phaseId?: string; // شناسه فاز انتخابی یا ساخته‌شده
  phaseName?: string; // نام فاز

  // تنظیمات انعطاف تاریخ‌ها
  hasStartDate?: boolean;
  hasEndDate?: boolean;

  // مبالغ و تاریخ‌ها
  initialAmount: number;     // مبلغ اولیه قرارداد (تومان)
  managementFeePercent?: number; // درصد مدیریت پیمان
  managementMinFee?: number;
  managementMaxFee?: number;
  costPlusFixedFee?: number;
  startDate: string;         // تاریخ شروع (شمسی)
  initialEndDate: string;    // تاریخ پایان اولیه
  currentEndDate: string;    // تاریخ پایان جاری (با احتساب تمدیدهای متمم)

  // کسورات قانونی و تضامین
  prepaymentAmount: number;  // پیش‌پرداخت
  retentionPercent: number;  // درصد سپرده حسن انجام کار (مثلاً ۱۰٪)
  retentionReleaseDate: string; // تاریخ سررسید آزادسازی سپرده
  retentionReleased: boolean;
  retentionReleasedAmount?: number;
  insurancePercent: number;  // درصد بیمه تأمین اجتماعی
  taxPercent: number;        // درصد مالیات
  dailyDelayPenalty: number; // جریمه تأخیر روزانه (تومان)

  // ضمایم و فازها
  guarantees: ContractGuarantee[];
  addendums: ContractAddendum[];
  phases: ContractPhase[];
  measurementItems: ContractMeasurementItem[];
  attachments: ContractAttachment[];

  // متن حقوقی قرارداد
  subject?: string;          // موضوع قرارداد
  location?: string;         // محل اجرا
  legalText?: string;        // مفاد و تبصره‌های رسمی
  templateMode?: 'ARTICLES' | 'CUSTOM_TEMPLATE'; // تولید ماده‌به‌ماده یا قالب سفارشی تگ‌دار
  customTemplateText?: string; // متن قالب سفارشی تگ‌دار این قرارداد
  printMode?: 'WITH_HEADER' | 'PLAIN_TEXT'; // چاپ با سربرگ رسمی یا متن خالص
  contractArticles?: {
    article1?: string;
    article2?: string;
    article3?: string;
    article4?: string;
    article5?: string;
    article6?: string;
    article7?: string;
    customClauses?: string[];
  };
  showDigitalSignature?: boolean;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ۲. استیت و اکشن‌های استور قراردادها
// ============================================================================

interface ContractState {
  contracts: Contract[];

  // متدهای CRUD قرارداد
  addContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'guarantees' | 'addendums' | 'phases' | 'measurementItems' | 'attachments'> & {
    guarantees?: ContractGuarantee[];
    addendums?: ContractAddendum[];
    phases?: ContractPhase[];
    measurementItems?: ContractMeasurementItem[];
    attachments?: ContractAttachment[];
  }) => Contract;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  togglePinContract: (id: string) => void;

  // متدهای متمم و الحاقیه
  addAddendum: (contractId: string, addendum: Omit<ContractAddendum, 'id' | 'contractId' | 'number'>) => void;
  updateAddendum: (contractId: string, addendumId: string, updates: Partial<ContractAddendum>) => void;
  deleteAddendum: (contractId: string, addendumId: string) => void;

  // متدهای تضامین
  addGuarantee: (contractId: string, guarantee: Omit<ContractGuarantee, 'id' | 'contractId'>) => void;
  updateGuaranteeStatus: (contractId: string, guaranteeId: string, status: GuaranteeStatus, releaseDate?: string) => void;
  deleteGuarantee: (contractId: string, guaranteeId: string) => void;

  // متدهای ریز متره
  addMeasurementItem: (contractId: string, item: Omit<ContractMeasurementItem, 'id' | 'contractId' | 'rowNumber'>) => void;
  updateMeasurementItem: (contractId: string, itemId: string, updates: Partial<ContractMeasurementItem>) => void;
  deleteMeasurementItem: (contractId: string, itemId: string) => void;

  // متدهای فازبندی
  addPhase: (contractId: string, phase: Omit<ContractPhase, 'id' | 'contractId'>) => void;
  updatePhase: (contractId: string, phaseId: string, updates: Partial<ContractPhase>) => void;
  deletePhase: (contractId: string, phaseId: string) => void;

  // متدهای پیوست‌ها و اسناد
  addAttachment: (contractId: string, attachment: Omit<ContractAttachment, 'id' | 'contractId'>) => void;
  deleteAttachment: (contractId: string, attachmentId: string) => void;

  // همگام‌سازی با شبکه عنکبوتی
  syncContractWithProject: (contractId: string) => void;

  // موتور قالب‌ساز هوشمند پیش‌فرض سراسری
  defaultTemplateText: string;
  setDefaultTemplateText: (text: string) => void;
}

// دیتای پیش‌فرض نمونه برای اولین بار
const INITIAL_MOCK_CONTRACTS: Contract[] = [
  {
    id: 'cnt-demo-001',
    contractNumber: 'CNT-1403-010',
    title: 'قرارداد اجرای کامل اسکلت بتنی و سفت‌کاری برج بهاران',
    category: 'CLIENT_PROJECT',
    pricingModel: 'METRI_UNIT',
    status: 'ACTIVE',
    isPinned: true,
    projectId: 'p1',
    projectName: 'برج مسکونی بهاران',
    partyType: 'CLIENT',
    partyId: 'c1',
    partyName: 'مهندس رضایی (شرکت عمرانی پارس)',
    partyPhone: '09121112233',
    initialAmount: 4500000000, // ۴.۵ میلیارد تومان
    startDate: '1403/02/01',
    initialEndDate: '1403/11/30',
    currentEndDate: '1403/12/25',
    prepaymentAmount: 500000000,
    retentionPercent: 10,
    retentionReleaseDate: '1404/03/25',
    retentionReleased: false,
    insurancePercent: 5,
    taxPercent: 0,
    dailyDelayPenalty: 2500000,
    subject: 'اجرای کامل اسکلت بتن آرمه، دیوارچینی سفال و تیغه‌بندی طبقات ۱ الی ۸',
    location: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
    guarantees: [
      {
        id: 'g-demo-1',
        contractId: 'cnt-demo-001',
        type: 'CHEQUE',
        serialNumber: '8920145623019842',
        bankName: 'بانک ملت شعبه سعادت‌آباد',
        amount: 450000000,
        dueDate: '1404/03/25',
        issueDate: '1403/02/01',
        issuerName: 'شرکت عمرانی پارس',
        receiverName: 'شرکت ساختمانی پیمان',
        direction: 'RECEIVED',
        status: 'HELD',
        description: 'چک صیادی بابت حسن انجام تعهدات و اجرای پروژه',
      }
    ],
    addendums: [
      {
        id: 'add-demo-1',
        contractId: 'cnt-demo-001',
        number: 1,
        title: 'متمم افزایش متراژ تیغه‌چینی و تمدید مهلت',
        date: '1403/07/15',
        amountDelta: 350000000, // ۳۵۰ میلیون تومان افزایش
        quantityDelta: 450,
        newEndDate: '1403/12/25',
        description: 'افزایش متراژ دیوارهای پیرامونی به دلیل تغییر نقشه معماری طبقه ۳ و ۴ و تمدید ۲۵ روز مهلت اجرا.',
      }
    ],
    phases: [
      {
        id: 'ph-demo-1',
        contractId: 'cnt-demo-001',
        name: 'فاز اول: فونداسیون و آرماتوربندی کف',
        status: 'COMPLETED',
        pricingModel: 'METRI_UNIT',
        weightPercentage: 25,
        estimatedAmount: 1125000000,
        certifiedAmount: 1125000000,
        startDate: '1403/02/05',
        endDate: '1403/04/10',
        progressPercentage: 100,
      },
      {
        id: 'ph-demo-2',
        contractId: 'cnt-demo-001',
        name: 'فاز دوم: بتن‌ریزی ستون‌ها و سقف طبقات ۱ تا ۴',
        status: 'COMPLETED',
        pricingModel: 'METRI_UNIT',
        weightPercentage: 35,
        estimatedAmount: 1575000000,
        certifiedAmount: 1575000000,
        startDate: '1403/04/15',
        endDate: '1403/07/20',
        progressPercentage: 100,
      },
      {
        id: 'ph-demo-3',
        contractId: 'cnt-demo-001',
        name: 'فاز سوم: اجرای سقف‌های طبقات ۵ تا ۸ و تیغه‌چینی',
        status: 'IN_PROGRESS',
        pricingModel: 'METRI_UNIT',
        weightPercentage: 40,
        estimatedAmount: 2150000000,
        certifiedAmount: 1200000000,
        startDate: '1403/08/01',
        endDate: '1403/12/25',
        progressPercentage: 65,
      }
    ],
    measurementItems: [
      {
        id: 'm-demo-1',
        contractId: 'cnt-demo-001',
        rowNumber: 1,
        description: 'آرماتوربندی فونداسیون و ستون‌ها با میلگرد آجدار A3',
        unit: 'تن',
        quantity: 120,
        unitPrice: 3800000,
        totalPrice: 456000000,
        completedQuantity: 120,
      },
      {
        id: 'm-demo-2',
        contractId: 'cnt-demo-001',
        rowNumber: 2,
        description: 'قالب‌بندی فلزی ستون‌ها، تیرها و دال سقف',
        unit: 'مترمربع',
        length: 25,
        width: 18,
        height: 3.2,
        count: 8,
        quantity: 3600,
        unitPrice: 195000,
        totalPrice: 702000000,
        completedQuantity: 2800,
      },
      {
        id: 'm-demo-3',
        contractId: 'cnt-demo-001',
        rowNumber: 3,
        description: 'تیغه‌چینی سفال ۱۵ سانتی با ملات ماسه سیمان',
        unit: 'مترمربع',
        quantity: 2200,
        unitPrice: 280000,
        totalPrice: 616000000,
        completedQuantity: 1450,
      }
    ],
    attachments: [],
    legalText: `ماده ۱- طرفین قرارداد:
این قرارداد فی‌مابین شرکت ساختمانی و مهندسی پیمان به مدیریت پیمان حسینی (پیمانکار) و شرکت عمرانی پارس به مدیریت مهندس رضایی (کارفرما) منعقد می‌گردد.

ماده ۲- موضوع قرارداد:
انجام عملیات اسکلت بتنی و سفت‌کاری پروژه ساختمانی بهاران مطابق با نقشه‌های مصوب سازه و معماری پیوست.

ماده ۳- مبلغ و شرایط پرداخت:
مبلغ اولیه قرارداد معادل ۴,۵۰۰,۰۰۰,۰۰۰ تومان بوده که بر اساس پیشرفت فیزیکی و تأیید مهندس ناظر در قالب صورت‌وضعیت‌های ماهانه پرداخت می‌گردد.

ماده ۴- کسورات و تضامین:
از هر پرداخت صورت‌وضعیت، معادل ۱۰ درصد به عنوان سپرده حسن انجام کار کسر گردیده و پس از تحویل موقت و تأیید ناظر آزاد خواهد شد.`,
    createdAt: '1403/02/01',
    updatedAt: '1403/07/15',
  },
  {
    id: 'cnt-demo-002',
    contractNumber: 'CNT-1403-018',
    title: 'قرارداد گچ‌کاری و سفیدکاری اکیپ استاد مرادی',
    category: 'SUBCONTRACTOR_LABOR',
    pricingModel: 'METRI_UNIT',
    status: 'ACTIVE',
    isPinned: false,
    projectId: 'p1',
    projectName: 'برج مسکونی بهاران',
    partyType: 'WORKER',
    partyName: 'استاد علی مرادی (اکیپ گچ‌کار)',
    partyPhone: '09123344556',
    initialAmount: 380000000, // ۳۸۰ میلیون
    startDate: '1403/07/01',
    initialEndDate: '1403/09/30',
    currentEndDate: '1403/09/30',
    prepaymentAmount: 50000000,
    retentionPercent: 10,
    retentionReleaseDate: '1403/10/30',
    retentionReleased: false,
    insurancePercent: 0,
    taxPercent: 0,
    dailyDelayPenalty: 500000,
    guarantees: [
      {
        id: 'g-demo-2',
        contractId: 'cnt-demo-002',
        type: 'PROMISSORY_NOTE',
        serialNumber: 'SN-7840192',
        amount: 100000000,
        dueDate: '1403/10/30',
        issuerName: 'علی مرادی',
        receiverName: 'شرکت پیمان',
        direction: 'RECEIVED',
        status: 'HELD',
        description: 'سفته حسن اجرای سفیدکاری طبقات',
      }
    ],
    addendums: [],
    phases: [],
    measurementItems: [
      {
        id: 'm-demo-4',
        contractId: 'cnt-demo-002',
        rowNumber: 1,
        description: 'گچ و خاک و سفیدکاری دیوارها و سقف',
        unit: 'مترمربع',
        quantity: 3200,
        unitPrice: 110000,
        totalPrice: 352000000,
        completedQuantity: 2100,
      }
    ],
    attachments: [],
    createdAt: '1403/07/01',
    updatedAt: '1403/07/01',
  },
  {
    id: 'cnt-demo-003',
    contractNumber: 'CNT-1403-025',
    title: 'قرارداد اجاره تاور کرین ۶ تن و ژنراتور کارگاه',
    category: 'EQUIPMENT_RENTAL',
    pricingModel: 'LUMPSUM_CONTRAT',
    status: 'ACTIVE',
    isPinned: false,
    projectId: 'p1',
    projectName: 'برج مسکونی بهاران',
    partyType: 'EQUIPMENT_OWNER',
    partyName: 'تجهیزات راهسازی البرز (مهندس مهدوی)',
    partyPhone: '09124455667',
    rentalDirection: 'RENT_IN',
    initialAmount: 420000000,
    startDate: '1403/03/01',
    initialEndDate: '1403/09/30',
    currentEndDate: '1403/11/30',
    prepaymentAmount: 80000000,
    retentionPercent: 0,
    retentionReleaseDate: '1403/11/30',
    retentionReleased: false,
    insurancePercent: 0,
    taxPercent: 0,
    dailyDelayPenalty: 1000000,
    guarantees: [
      {
        id: 'g-demo-3',
        contractId: 'cnt-demo-003',
        type: 'CHEQUE',
        serialNumber: '7840192301827364',
        bankName: 'بانک صادرات',
        amount: 150000000,
        dueDate: '1403/11/30',
        issuerName: 'شرکت پیمان',
        receiverName: 'تجهیزات راهسازی البرز',
        direction: 'GIVEN',
        status: 'HELD',
        description: 'چک ضمانت سلامت دستگاه و تحویل به موقع',
      }
    ],
    addendums: [
      {
        id: 'add-demo-2',
        contractId: 'cnt-demo-003',
        number: 1,
        title: 'تمدید ۲ ماهه اجاره تاور کرین',
        date: '1403/09/20',
        amountDelta: 120000000,
        newEndDate: '1403/11/30',
        description: 'تمدید مدت اجاره تا پایان مرحله سفت‌کاری سقف هشتم.',
      }
    ],
    phases: [],
    measurementItems: [],
    attachments: [],
    createdAt: '1403/03/01',
    updatedAt: '1403/09/20',
  },
  {
    id: 'cnt-demo-004',
    contractNumber: 'CNT-1403-031',
    title: 'قرارداد تأمین و خرید میلگرد از کارخانه ذوب‌آهن',
    category: 'MATERIAL_SUPPLY',
    pricingModel: 'METRI_UNIT',
    status: 'ACTIVE',
    isPinned: false,
    projectId: 'p1',
    projectName: 'برج مسکونی بهاران',
    partyType: 'SUPPLIER',
    partyName: 'بازرگانی آهن و فولاد پایتخت',
    partyPhone: '09125566778',
    initialAmount: 1850000000,
    startDate: '1403/02/10',
    initialEndDate: '1403/08/30',
    currentEndDate: '1403/08/30',
    prepaymentAmount: 500000000,
    retentionPercent: 5,
    retentionReleaseDate: '1403/09/30',
    retentionReleased: true,
    retentionReleasedAmount: 92500000,
    insurancePercent: 0,
    taxPercent: 9,
    dailyDelayPenalty: 2000000,
    guarantees: [],
    addendums: [],
    phases: [],
    measurementItems: [
      {
        id: 'm-demo-5',
        contractId: 'cnt-demo-004',
        rowNumber: 1,
        description: 'میلگرد ۱۶ آجدار A3 استاندارد ذوب‌آهن',
        unit: 'تن',
        quantity: 35,
        unitPrice: 28500000,
        totalPrice: 997500000,
        completedQuantity: 35,
      },
      {
        id: 'm-demo-6',
        contractId: 'cnt-demo-004',
        rowNumber: 2,
        description: 'میلگرد ۲۰ آجدار A3 استاندارد ذوب‌آهن',
        unit: 'تن',
        quantity: 30,
        unitPrice: 28400000,
        totalPrice: 852000000,
        completedQuantity: 30,
      }
    ],
    attachments: [],
    createdAt: '1403/02/10',
    updatedAt: '1403/08/30',
  }
];

// توابع کمکی برای محاسبات
export const calculateFinalContractAmount = (contract: Contract): number => {
  const addendumsSum = (contract.addendums || []).reduce((acc, a) => acc + (a.amountDelta || 0), 0);
  return (contract.initialAmount || 0) + addendumsSum;
};

export const calculateRetentionAmount = (contract: Contract): number => {
  const finalAmount = calculateFinalContractAmount(contract);
  return Math.round((finalAmount * (contract.retentionPercent || 0)) / 100);
};

export const calculateMeasurementTotal = (items: ContractMeasurementItem[]): { totalAmount: number; certifiedAmount: number } => {
  let totalAmount = 0;
  let certifiedAmount = 0;
  (items || []).forEach(item => {
    const total = (item.quantity || 0) * (item.unitPrice || 0);
    totalAmount += total;
    const cert = (item.completedQuantity || 0) * (item.unitPrice || 0);
    certifiedAmount += cert;
  });
  return { totalAmount, certifiedAmount };
};

// متن قالب پیش‌فرض سراسری قرارداد با تگ‌های هوشمند
export const DEFAULT_CONTRACT_TEMPLATE = `بسمه تعالی
قرارداد پیمانکاری و اجرای عملیات ساختمانی

ماده ۱ - طرفین قرارداد:
این قرارداد در تاریخ {{تاریخ_عقد}} فی‌مابین {{نام_شرکت_پیمانکاری}} به نمایندگی {{لیست_کامل_پیمانکاران}} به عنوان «طرف اول / پیمانکار» از یک‌سو، و {{لیست_کامل_کارفرمایان}} به عنوان «طرف دوم / کارفرما» از سوی دیگر، منعقد گردید و طرفین متعهد و ملزم به رعایت کلیه مفاد و شروط آن می‌باشند.

ماده ۲ - موضوع و محل اجرای قرارداد:
موضوع قرارداد عبارت است از: {{نوع_کارکرد}} در {{نام_پروژه}} {{فاز_پروژه}} واقع در {{آدرس_پروژه}} مطابق با مشخصات فنی، نقشه‌های اجرایی مصوب و استانداردهای سازمان نظام مهندسی کشور.

ماده ۳ - مدت زمان اجرای قرارداد:
مدت زمان اجرای موضوع پیمان {{مدت_قرارداد}} می‌باشد. هرگونه تمدید مدت یا تعلیق کار منوط به توافق کتبی طرفین و صدور متمم رسمی خواهد بود.

ماده ۴ - مبلغ کل قرارداد و نحوه پرداخت:
مبلغ توافق‌شده برای اجرای موضوع پیمان معادل {{مبلغ_یا_درصد_قرارداد}} تومان (به حروف: {{مبلغ_به_حروف}} تومان) می‌باشد که بر اساس پیشرفت واقعی کار و تأیید صورت‌وضعیت‌ها تسویه خواهد شد.

ماده ۵ - ایمنی کارگاه (HSE) و تعهدات اجرایی:
پیمانکار موظف به رعایت کامل آیین‌نامه‌های حفاظت و بهداشت کار، استفاده از کارگران دارای مهارت و تجهیزات ایمنی در کارگاه می‌باشد.

ماده ۶ - حل اختلاف و قوانین حاکم:
کلیه اختلافات احتمالی ناشی از تعبیر یا اجرای این قرارداد، بدواً از طریق مذاکره مسالمت‌آمیز و در صورت عدم حصول توافق، از طریق داوری مرضی‌الطرفین حل و فصل خواهد شد. این قرارداد در نسخ معتبر تنظیم و به امضای طرفین رسید.

{{لیست_شاهدین}}`;

// ============================================================================
// ۳. ایجاد استور قراردادها با Zustand
// ============================================================================

export const useContractStore = create<ContractState>()(
  persist(
    (set, get) => ({
      contracts: INITIAL_MOCK_CONTRACTS,
      defaultTemplateText: DEFAULT_CONTRACT_TEMPLATE,

      setDefaultTemplateText: (text: string) => set({ defaultTemplateText: text }),

      // ۱. افزودن قرارداد جدید
      addContract: (contractData) => {
        const id = generateUUID();
        const now = moment().format('jYYYY/jMM/jDD');
        const newContract: Contract = {
          ...contractData,
          id,
          isPinned: contractData.isPinned ?? false,
          currentEndDate: contractData.initialEndDate || '',
          templateMode: contractData.templateMode || 'ARTICLES',
          customTemplateText: contractData.customTemplateText || '',
          printMode: contractData.printMode || 'WITH_HEADER',
          guarantees: contractData.guarantees || [],
          addendums: contractData.addendums || [],
          phases: contractData.phases || [],
          measurementItems: contractData.measurementItems || [],
          attachments: contractData.attachments || [],
          employers: contractData.employers || [],
          contractors: contractData.contractors || [],
          witnesses: contractData.witnesses || [],
          scopeType: contractData.scopeType || 'WHOLE_PROJECT',
          hasStartDate: contractData.hasStartDate ?? true,
          hasEndDate: contractData.hasEndDate ?? true,
          retentionReleased: contractData.retentionReleased ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          contracts: [newContract, ...state.contracts]
        }));

        // همگام‌سازی با پروژه در صورت اتصال
        if (newContract.projectId) {
          get().syncContractWithProject(newContract.id);
        }

        // اسکن مرکز هشدارها
        try {
          useAlertStore.getState().scanSystemAlerts();
        } catch (e) {
          console.warn('Alert store scan skipped:', e);
        }

        return newContract;
      },

      // ۲. ویرایش قرارداد
      updateContract: (id, updates) => {
        const now = moment().format('jYYYY/jMM/jDD');
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === id) {
              const updated = { ...c, ...updates, updatedAt: now };
              // اگر تمدید متمم نداشتیم و initialEndDate تغییر کرد:
              if (updates.initialEndDate && (!c.addendums || c.addendums.length === 0)) {
                updated.currentEndDate = updates.initialEndDate;
              }
              return updated;
            }
            return c;
          })
        }));

        const updatedContract = get().contracts.find(c => c.id === id);
        if (updatedContract?.projectId) {
          get().syncContractWithProject(id);
        }

        try {
          useAlertStore.getState().scanSystemAlerts();
        } catch (e) {
          console.warn('Alert store scan skipped:', e);
        }
      },

      // ۳. حذف قرارداد
      deleteContract: (id) => {
        set((state) => ({
          contracts: state.contracts.filter((c) => c.id !== id)
        }));

        try {
          useAlertStore.getState().scanSystemAlerts();
        } catch (e) {
          console.warn('Alert store scan skipped:', e);
        }
      },

      // ۴. پین / ستاره‌دار کردن قرارداد
      togglePinContract: (id) => {
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id ? { ...c, isPinned: !c.isPinned } : c
          )
        }));
      },

      // ۵. افزودن متمم / الحاقیه
      addAddendum: (contractId, addendumData) => {
        const addendumId = generateUUID();
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              const nextNum = (c.addendums?.length || 0) + 1;
              const newAddendum: ContractAddendum = {
                ...addendumData,
                id: addendumId,
                contractId,
                number: nextNum,
              };
              const updatedAddendums = [...(c.addendums || []), newAddendum];
              
              // بروزرسانی تاریخ پایان جاری در صورت تمدید
              let updatedEndDate = c.currentEndDate;
              if (addendumData.newEndDate) {
                updatedEndDate = addendumData.newEndDate;
              }

              return {
                ...c,
                addendums: updatedAddendums,
                currentEndDate: updatedEndDate,
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));

        get().syncContractWithProject(contractId);
      },

      updateAddendum: (contractId, addendumId, updates) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              const updatedAddendums = (c.addendums || []).map(a =>
                a.id === addendumId ? { ...a, ...updates } : a
              );
              return {
                ...c,
                addendums: updatedAddendums,
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      deleteAddendum: (contractId, addendumId) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              const filtered = (c.addendums || []).filter(a => a.id !== addendumId);
              // بازنشانی تاریخ پایان جاری به آخرین متمم یا تاریخ اولیه
              const lastWithDate = [...filtered].reverse().find(a => a.newEndDate);
              const endDate = lastWithDate?.newEndDate || c.initialEndDate;
              return {
                ...c,
                addendums: filtered,
                currentEndDate: endDate,
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      // ۶. متدهای تضامین (چک، سفته، ضمانت‌نامه)
      addGuarantee: (contractId, guaranteeData) => {
        const id = generateUUID();
        const newGuarantee: ContractGuarantee = {
          ...guaranteeData,
          id,
          contractId,
        };
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                guarantees: [newGuarantee, ...(c.guarantees || [])],
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      updateGuaranteeStatus: (contractId, guaranteeId, status, releaseDate) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                guarantees: (c.guarantees || []).map((g) =>
                  g.id === guaranteeId ? { ...g, status, releaseDate: releaseDate || g.releaseDate } : g
                ),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      deleteGuarantee: (contractId, guaranteeId) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                guarantees: (c.guarantees || []).filter(g => g.id !== guaranteeId),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      // ۷. متدهای ریزمتره
      addMeasurementItem: (contractId, itemData) => {
        const id = generateUUID();
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              const rowNum = (c.measurementItems?.length || 0) + 1;
              const newItem: ContractMeasurementItem = {
                ...itemData,
                id,
                contractId,
                rowNumber: rowNum,
                totalPrice: (itemData.quantity || 0) * (itemData.unitPrice || 0),
              };
              return {
                ...c,
                measurementItems: [...(c.measurementItems || []), newItem],
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      updateMeasurementItem: (contractId, itemId, updates) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                measurementItems: (c.measurementItems || []).map((m) => {
                  if (m.id === itemId) {
                    const merged = { ...m, ...updates };
                    merged.totalPrice = (merged.quantity || 0) * (merged.unitPrice || 0);
                    return merged;
                  }
                  return m;
                }),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      deleteMeasurementItem: (contractId, itemId) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              const filtered = (c.measurementItems || []).filter(m => m.id !== itemId);
              // شماره‌گذاری مجدد ردیف‌ها
              const reordered = filtered.map((m, idx) => ({ ...m, rowNumber: idx + 1 }));
              return {
                ...c,
                measurementItems: reordered,
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      // ۸. متدهای فازبندی
      addPhase: (contractId, phaseData) => {
        const id = generateUUID();
        const newPhase: ContractPhase = {
          ...phaseData,
          id,
          contractId,
        };
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                phases: [...(c.phases || []), newPhase],
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      updatePhase: (contractId, phaseId, updates) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                phases: (c.phases || []).map(p =>
                  p.id === phaseId ? { ...p, ...updates } : p
                ),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      deletePhase: (contractId, phaseId) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                phases: (c.phases || []).filter(p => p.id !== phaseId),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      // ۹. متدهای پیوست‌ها و مدارک
      addAttachment: (contractId, attachmentData) => {
        const id = generateUUID();
        const newAtt: ContractAttachment = {
          ...attachmentData,
          id,
          contractId,
        };
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                attachments: [newAtt, ...(c.attachments || [])],
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      deleteAttachment: (contractId, attachmentId) => {
        set((state) => ({
          contracts: state.contracts.map((c) => {
            if (c.id === contractId) {
              return {
                ...c,
                attachments: (c.attachments || []).filter(a => a.id !== attachmentId),
                updatedAt: moment().format('jYYYY/jMM/jDD'),
              };
            }
            return c;
          })
        }));
      },

      // ۱۰. همگام‌سازی دوطرفه با پروژه در شبکه عنکبوتی
      syncContractWithProject: (contractId) => {
        const contract = get().contracts.find(c => c.id === contractId);
        if (!contract || !contract.projectId) return;

        try {
          const projectStore = useProjectStore.getState();
          const targetProject = projectStore.projects.find(p => p.id === contract.projectId);
          if (!targetProject) return;

          // همگام‌سازی فازها در صورت وجود
          if (contract.phases && contract.phases.length > 0) {
            const mappedPhases = contract.phases.map(cp => ({
              id: cp.id,
              name: cp.name,
              isCompleted: cp.status === 'COMPLETED',
              contractType: contract.pricingModel === 'LUMPSUM_CONTRAT' ? 'CONTRAT' :
                            contract.pricingModel === 'METRI_UNIT' ? 'METRI' :
                            contract.pricingModel === 'PERCENTAGE_MANAGEMENT' ? 'PERCENTAGE' : 'CUSTOM',
              photos: [],
              financials: {
                expenditure: cp.certifiedAmount || 0,
              },
              unitPrice: cp.estimatedAmount,
              fixedPrice: cp.estimatedAmount,
            }));

            projectStore.updateProject(contract.projectId, {
              phases: mappedPhases,
            });
          }
        } catch (e) {
          console.warn('Could not sync contract with project:', e);
        }
      },
    }),
    {
      name: 'peyman_contracts_storage',
    }
  )
);
