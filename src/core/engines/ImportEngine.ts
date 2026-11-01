import Fuse from 'fuse.js';
import moment from 'moment-jalaali';

export type ImportTargetModule =
  | 'FINANCE'
  | 'LABOR'
  | 'PURCHASES'
  | 'LOGISTICS'
  | 'LABOR_MONTHLY'
  | 'LABOR_MISC'
  | 'VEHICLE_FREIGHT'
  | 'TOOL_RENTAL'
  | 'LOGISTICS_REPAIR'
  | 'LOGISTICS_SERVICE'
  | 'LOGISTICS_INSURANCE'
  | 'LOGISTICS_MISC'
  | 'LOGISTICS_DRIVER'
  | 'INVENTORY'
  | 'IGNORE'
  | 'UNKNOWN';

export type ProjectPhaseGuess = 'EXCAVATION' | 'STRUCTURE' | 'ROUGHING' | 'FINISHING' | 'GENERAL';
export type ChequeStatusGuess = 'CASHED' | 'PENDING' | 'BOUNCED' | 'RETURNED' | null;
export type SettlementStatusGuess = 'SETTLED' | 'PENDING' | 'PARTIAL';
export type DetectedEntityType = 'WORKER' | 'VEHICLE' | 'TOOL' | 'SUPPLIER' | 'CLIENT' | 'INVENTORY' | null;

export interface ParsedRow {
  _index: number;
  _originalData: any;
  _targetModule: ImportTargetModule;
  _subModule?: string;
  _confidence: number;
  _groupId?: string;
  _isSplitChild?: boolean;

  date: string;
  originalDateText: string;
  title: string;
  typeDetail: string;
  amount: number;
  qty: number;
  unitPrice: number;
  unit: string;
  percentageRaw: string;

  calculatedDiscount: number;
  calculatedTax: number;
  calculatedMarkup: number;
  calculatedManagementFee: number;
  calculatedGoodPerformance: number;
  calculatedInsurance: number;

  extractedCardNumber?: string;
  extractedIban?: string;
  extractedChequeSayyad?: string;
  extractedNationalId?: string;
  extractedPhone?: string;
  extractedPlate?: string;
  extractedSerial?: string;
  extractedOdometer?: number;

  suggestedPhase: ProjectPhaseGuess;
  suggestedChequeStatus: ChequeStatusGuess;
  suggestedSettlementStatus?: SettlementStatusGuess;
  detectedCurrency: 'TOMAN' | 'RIAL';

  detectedEntityType?: DetectedEntityType;
  linkedProfileId?: string;
  linkedProfileName?: string;
  linkedWorkerId?: string;
  linkedVehicleId?: string;
  linkedToolId?: string;
  linkedSupplierId?: string;
  linkedClientId?: string;
  linkedProjectId?: string;
  isInternalAsset?: boolean;
  isLearnedMatch?: boolean;

  needsUserAction: string[];
  linkedParentRowIndexes?: number[];
  validationErrors: string[];
  isIntraFileDuplicate?: boolean;
}

export interface SystemMasterData {
  workers: any[];
  vehicles: any[];
  tools?: any[];
  inventory: any[];
  clients: any[];
  projects?: any[];
  suppliers?: any[];
  activeTaxRates?: number[];
}

interface LearnedTokenEntry {
  module: ImportTargetModule;
  profileId?: string;
  profileName?: string;
  projectId?: string;
  clientId?: string;
  entityType?: DetectedEntityType;
  weight: number;
  updatedAt: number;
}

interface StickyContextState {
  lastValidDate: string;
  contextProjectId?: string;
  contextClientId?: string;
  contextWorkerId?: string;
  contextWorkerName?: string;
  contextVehicleId?: string;
  contextVehicleName?: string;
  contextToolId?: string;
  contextToolName?: string;
  contextSupplierId?: string;
  contextSupplierName?: string;
  contextPhase?: ProjectPhaseGuess;
  contextModuleHint?: ImportTargetModule;
}

const BRAIN_STORAGE_KEY = 'peyman_erp_self_learning_import_brain_v4';

const PERSIAN_MONTHS: Record<string, string> = {
  'فروردین': '01', 'اردیبهشت': '02', 'خرداد': '03', 'تیر': '04', 'تیرماه': '04',
  'مرداد': '05', 'امرداد': '05', 'شهریور': '06', 'مهر': '07', 'مهرماه': '07',
  'آبان': '08', 'ابان': '08', 'آذر': '09', 'اذر': '09', 'دی': '10', 'دیماه': '10',
  'بهمن': '11', 'اسفند': '12'
};

const PERSIAN_WORD_NUMBERS: Record<string, number> = {
  'نیم': 0.5, 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5,
  'شش': 6, 'شیش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
  'یازده': 11, 'دوازده': 12, 'پانزده': 15, 'پونزده': 15, 'بیست': 20,
  'سی': 30, 'چهل': 40, 'پنجاه': 50, 'شصت': 60, 'هفتاد': 70, 'هشتاد': 80, 'نود': 90,
  'صد': 100, 'یکصد': 100, 'دویست': 200, 'سیصد': 300, 'چهارصد': 400,
  'پانصد': 500, 'پونصد': 500, 'ششصد': 600, 'هفتصد': 700, 'هشتصد': 800, 'نهصد': 900
};

const EXTRACTABLE_UNITS = [
  'پاکت', 'کیسه', 'تن', 'کیلو', 'کیلوگرم', 'گرم', 'سرویس', 'ماشین', 'شاخه', 'متر', 'مترطول', 'مترمکعب',
  'مترمربع', 'طول', 'عدد', 'بسته', 'دستگاه', 'لیتر', 'گالن', 'کارتن', 'حلقه', 'رول',
  'تخته', 'قوطی', 'جین', 'جفت', 'ست', 'پالت', 'بند', 'جام', 'قالب', 'دست', 'شیفت',
  'نفر', 'نفر-روز', 'روز', 'ساعت', 'ماه', 'کامیون', 'طاقه', 'برگ', 'گونی', 'حلب', 'بشکه', 'شیت', 'توپ', 'فقره', 'کورس'
];

const PHASE_DICTIONARY: Record<string, ProjectPhaseGuess> = {
  'خاکبرداری': 'EXCAVATION', 'گودبرداری': 'EXCAVATION', 'لودر': 'EXCAVATION', 'بیل': 'EXCAVATION',
  'تخریب': 'EXCAVATION', 'نخاله': 'EXCAVATION', 'مگر': 'EXCAVATION', 'فونداسیون': 'EXCAVATION',
  'پی کنی': 'EXCAVATION', 'شفته': 'EXCAVATION', 'شناژ': 'EXCAVATION', 'بولت': 'EXCAVATION', 'تراز': 'EXCAVATION',
  'سازه نگهبان': 'EXCAVATION', 'حفر چاه': 'EXCAVATION', 'نیلینگ': 'EXCAVATION', 'میکروپایل': 'EXCAVATION',
  'خاکریزی': 'EXCAVATION', 'تسطیح': 'EXCAVATION', 'رگلاژ': 'EXCAVATION', 'بستر سازی': 'EXCAVATION',

  'آرماتور': 'STRUCTURE', 'بتن': 'STRUCTURE', 'میلگرد': 'STRUCTURE', 'تیرآهن': 'STRUCTURE',
  'قالب': 'STRUCTURE', 'بیس پلیت': 'STRUCTURE', 'جوشکاری': 'STRUCTURE', 'اسکلت': 'STRUCTURE',
  'سقف': 'STRUCTURE', 'تیرچه': 'STRUCTURE', 'کرومیت': 'STRUCTURE', 'عرشه فولادی': 'STRUCTURE',
  'نبشی': 'STRUCTURE', 'ناودانی': 'STRUCTURE', 'سپری': 'STRUCTURE', 'صفحه ستون': 'STRUCTURE',
  'بادبند': 'STRUCTURE', 'خاموت': 'STRUCTURE', 'سنجاقی': 'STRUCTURE', 'خرپا': 'STRUCTURE',
  'اسپیسر': 'STRUCTURE', 'روان کننده': 'STRUCTURE', 'ضدیخ': 'STRUCTURE', 'یونولیت': 'STRUCTURE',
  'سوله': 'STRUCTURE', 'پوشش سقف': 'STRUCTURE', 'کلاف': 'STRUCTURE', 'شمع': 'STRUCTURE',
  'وال پست': 'STRUCTURE', 'مهاربند': 'STRUCTURE', 'سازه فضایی': 'STRUCTURE',

  'آجر': 'ROUGHING', 'سفال': 'ROUGHING', 'بلوک': 'ROUGHING', 'سیمان': 'ROUGHING', 'لوله': 'ROUGHING',
  'ایزوگام': 'ROUGHING', 'پوکه': 'ROUGHING', 'گچ خاک': 'ROUGHING', 'دیوارچینی': 'ROUGHING',
  'تیغه': 'ROUGHING', 'ملات': 'ROUGHING', 'پودر سنگ': 'ROUGHING', 'ماسه': 'ROUGHING',
  'عایق': 'ROUGHING', 'قیر': 'ROUGHING', 'گونی': 'ROUGHING', 'فوم': 'ROUGHING', 'پلیکا': 'ROUGHING',
  'پوشیکا': 'ROUGHING', 'پنجره فرم': 'ROUGHING', 'فریم': 'ROUGHING', 'سیم کشی': 'ROUGHING', 'داکت': 'ROUGHING',
  'تاسیسات مکانیکی': 'ROUGHING', 'تاسیسات الکتریکی': 'ROUGHING', 'شیارزنی': 'ROUGHING', 'قوطی گذاری': 'ROUGHING',
  'لوله کشی': 'ROUGHING', 'فاضلاب': 'ROUGHING', 'کف سازی': 'ROUGHING', 'پوکه ریزی': 'ROUGHING',
  'داکت اسپلیت': 'ROUGHING', 'چیلر': 'ROUGHING', 'موتورخانه': 'ROUGHING', 'هواکش': 'ROUGHING',
  'سینی کابل': 'ROUGHING', 'لوله مسی': 'ROUGHING', 'اطفاء حریق': 'ROUGHING',

  'گچ': 'FINISHING', 'کاشی': 'FINISHING', 'سرامیک': 'FINISHING', 'رنگ': 'FINISHING',
  'شیرآلات': 'FINISHING', 'کلید': 'FINISHING', 'توالت': 'FINISHING', 'کاسه': 'FINISHING',
  'فلاش تانک': 'FINISHING', 'شیر': 'FINISHING', 'درب': 'FINISHING', 'پنجره': 'FINISHING',
  'روشویی': 'FINISHING', 'قرنیز': 'FINISHING', 'موزاییک': 'FINISHING', 'پارکت': 'FINISHING',
  'لمینت': 'FINISHING', 'کاغذ دیواری': 'FINISHING', 'سنگ پله': 'FINISHING', 'سنگ نما': 'FINISHING',
  'تراورتن': 'FINISHING', 'گرانیت': 'FINISHING', 'مرمر': 'FINISHING', 'کناف': 'FINISHING',
  'سقف کاذب': 'FINISHING', 'رابیتس': 'FINISHING', 'نورمخفی': 'FINISHING', 'هالوژن': 'FINISHING',
  'لوستر': 'FINISHING', 'پریز': 'FINISHING', 'کابل': 'FINISHING', 'چسب': 'FINISHING', 'دستگیره': 'FINISHING',
  'سفیدکاری': 'FINISHING', 'نقاشی': 'FINISHING', 'کابینت': 'FINISHING', 'نصبیات': 'FINISHING', 'پکیج': 'FINISHING',
  'آینه کاری': 'FINISHING', 'موکت': 'FINISHING', 'یراق آلات': 'FINISHING', 'آیفون تصویری': 'FINISHING'
};

export const normalizePersianText = (text: any): string => {
  if (!text && text !== 0) return '';
  return String(text)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const toEnglishDigits = (str: any): string => {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
};

export const extractAmountStrict = (val: any, isCurrencyCell: boolean = false): { amount: number; currency: 'TOMAN' | 'RIAL' } => {
  if (val === null || val === undefined || val === '') return { amount: 0, currency: 'TOMAN' };

  const strVal = normalizePersianText(val).toLowerCase();
  const strEngDigits = toEnglishDigits(strVal);

  // جلوگیری از اشتباه گرفتن تاریخ، تلفن یا کد صیاد/کارت با مبلغ
  if (/^\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(strEngDigits.trim())) {
    return { amount: 0, currency: 'TOMAN' };
  }
  if (/^09\d{9}$/.test(strEngDigits.trim()) || /^\d{16}$/.test(strEngDigits.trim())) {
    return { amount: 0, currency: 'TOMAN' };
  }

  let currency: 'TOMAN' | 'RIAL' = 'TOMAN';
  let multiplier = 1;

  if (strVal.includes('ریال') || strVal.includes('rial') || strVal.includes('irr')) {
    multiplier = 0.1;
    currency = 'RIAL';
  }

  if (isCurrencyCell || /میلیون|هزار|میلیارد|ملیون|تومان|تومن|ریال/.test(strVal)) {
    if (strVal.includes('میلیارد')) multiplier *= 1000000000;
    else if (strVal.includes('میلیون') || strVal.includes('ملیون')) multiplier *= 1000000;
    else if (strVal.includes('هزار')) multiplier *= 1000;
  }

  const cleanString = strEngDigits.replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  let numVal = parseFloat(cleanString) || 0;

  // اگر عدد رقمی نبود اما عدد حروفی فارسی بود (مثلاً "پانصد هزار تومان" یا "دو میلیون")
  if (numVal === 0 && (isCurrencyCell || multiplier > 1)) {
    for (const [word, wordVal] of Object.entries(PERSIAN_WORD_NUMBERS)) {
      if (strVal.includes(word)) {
        numVal += wordVal;
      }
    }
  }

  return { amount: Math.round(numVal * multiplier), currency };
};

const parsePercentage = (val: any): number => {
  if (!val) return 0;
  const str = toEnglishDigits(String(val));
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

export class ImportEngine {
  private masterData: Required<SystemMasterData>;
  private fuseEngines: {
    workers: Fuse<any>;
    vehicles: Fuse<any>;
    tools: Fuse<any>;
    inventory: Fuse<any>;
    suppliers: Fuse<any>;
    clients: Fuse<any>;
    projects: Fuse<any>;
  };
  private standardTaxRates: number[];
  private learnedBrain: Record<string, LearnedTokenEntry>;

  constructor(masterData: SystemMasterData) {
    // برداشت زنده از تمام استورها و تاریخچه قبلی برنامه جهت خودآموزی لحظه‌ای
    const harvested = ImportEngine.harvestLiveStoresAndAutoTrain();

    this.masterData = {
      workers: this.mergeUniqueByIdOrName(masterData.workers || [], harvested.workers),
      vehicles: this.mergeUniqueByIdOrName(masterData.vehicles || [], harvested.vehicles),
      tools: this.mergeUniqueByIdOrName(masterData.tools || [], harvested.tools),
      inventory: this.mergeUniqueByIdOrName(masterData.inventory || [], harvested.inventory),
      clients: this.mergeUniqueByIdOrName(masterData.clients || [], harvested.clients),
      projects: this.mergeUniqueByIdOrName(masterData.projects || [], harvested.projects),
      suppliers: this.mergeUniqueByIdOrName(masterData.suppliers || [], harvested.suppliers),
      activeTaxRates: masterData.activeTaxRates || [0.09, 0.10]
    };

    this.standardTaxRates = this.masterData.activeTaxRates;
    this.learnedBrain = ImportEngine.loadBrain();

    this.fuseEngines = {
      workers: new Fuse(this.masterData.workers, { keys: ['name', 'lastName', 'fullName', 'specialty', 'phone1', 'nationalId'], threshold: 0.28, includeScore: true }),
      vehicles: new Fuse(this.masterData.vehicles, { keys: ['name', 'model', 'plate', 'type', 'driverName'], threshold: 0.28, includeScore: true }),
      tools: new Fuse(this.masterData.tools, { keys: ['name', 'brand', 'serialNumber', 'code', 'category'], threshold: 0.28, includeScore: true }),
      inventory: new Fuse(this.masterData.inventory, { keys: ['title', 'name', 'category', 'code'], threshold: 0.28, includeScore: true }),
      suppliers: new Fuse(this.masterData.suppliers, { keys: ['name', 'shopName', 'managerName', 'category', 'phone'], threshold: 0.28, includeScore: true }),
      clients: new Fuse(this.masterData.clients, { keys: ['name', 'lastName', 'companyName', 'phone'], threshold: 0.28, includeScore: true }),
      projects: new Fuse(this.masterData.projects, { keys: ['name', 'title', 'code', 'address'], threshold: 0.28, includeScore: true })
    };
  }

  // ============================================================================
  // 🧠 بخش ۱: موتور خودآموز زنده از استورها و تاریخچه کل برنامه (Live Auto-Trainer)
  // ============================================================================
  private mergeUniqueByIdOrName(primary: any[], secondary: any[]): any[] {
    const map = new Map<string, any>();
    [...secondary, ...primary].forEach(item => {
      if (!item) return;
      const key = String(item.id || item.name || item.title || JSON.stringify(item));
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  }

  private static harvestLiveStoresAndAutoTrain(): {
    workers: any[];
    vehicles: any[];
    tools: any[];
    inventory: any[];
    clients: any[];
    projects: any[];
    suppliers: any[];
  } {
    const result = {
      workers: [] as any[],
      vehicles: [] as any[],
      tools: [] as any[],
      inventory: [] as any[],
      clients: [] as any[],
      projects: [] as any[],
      suppliers: [] as any[]
    };
    if (typeof window === 'undefined' || !window.localStorage) return result;

    const brain = ImportEngine.loadBrain();
    let brainModified = false;

    const quickTrain = (text: string, mod: ImportTargetModule, profileId?: string, entityType?: DetectedEntityType) => {
      if (!text || text.length < 3) return;
      const tokens = ImportEngine.extractSignificantTokens(text).slice(0, 4);
      tokens.forEach(t => {
        if (!brain[t]) {
          brain[t] = {
            module: mod,
            profileId,
            entityType,
            weight: 18,
            updatedAt: Date.now()
          };
          brainModified = true;
        }
      });
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === BRAIN_STORAGE_KEY) continue;
        const raw = localStorage.getItem(key);
        if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) continue;

        try {
          const parsed = JSON.parse(raw);
          const state = parsed?.state || parsed;
          if (!state || typeof state !== 'object') continue;

          if (Array.isArray(state.workers)) {
            state.workers.forEach((w: any) => {
              const fullName = `${w.name || ''} ${w.lastName || ''}`.trim();
              result.workers.push({ ...w, fullName });
              quickTrain(fullName, 'LABOR', String(w.id), 'WORKER');
            });
          }
          if (Array.isArray(state.vehicles)) {
            state.vehicles.forEach((v: any) => {
              result.vehicles.push(v);
              quickTrain(`${v.name || ''} ${v.model || ''} ${v.plate || ''}`, 'VEHICLE_FREIGHT', String(v.id), 'VEHICLE');
            });
          }
          if (Array.isArray(state.tools)) {
            state.tools.forEach((t: any) => {
              result.tools.push(t);
              quickTrain(`${t.name || ''} ${t.brand || ''} ${t.serialNumber || ''}`, 'TOOL_RENTAL', String(t.id), 'TOOL');
            });
          }
          if (Array.isArray(state.items)) {
            state.items.forEach((it: any) => {
              result.inventory.push(it);
              quickTrain(it.name || it.title || '', 'INVENTORY', String(it.id), 'INVENTORY');
            });
          }
          if (Array.isArray(state.purchases)) {
            state.purchases.forEach((p: any) => {
              if (p.title) {
                result.inventory.push({ id: p.title, title: p.title, category: 'مصالح' });
                quickTrain(`${p.title} ${p.vendor || ''}`, 'PURCHASES');
              }
            });
          }
          if (Array.isArray(state.repairs)) {
            state.repairs.forEach((rep: any) => {
              quickTrain(`${rep.description || ''} ${rep.mechanicName || ''}`, 'LOGISTICS_REPAIR', rep.vehicleId);
            });
          }
          if (Array.isArray(state.periodicServices)) {
            state.periodicServices.forEach((srv: any) => {
              quickTrain(srv.notes || '', 'LOGISTICS_SERVICE', srv.vehicleId);
            });
          }
          if (Array.isArray(state.clients)) result.clients.push(...state.clients);
          if (Array.isArray(state.projects)) result.projects.push(...state.projects);
          if (Array.isArray(state.suppliers)) {
            state.suppliers.forEach((s: any) => {
              result.suppliers.push(s);
              const mod = s.category === 'repairShop' ? 'LOGISTICS_REPAIR' : 'PURCHASES';
              quickTrain(`${s.name || ''} ${s.shopName || ''}`, mod, String(s.id), 'SUPPLIER');
            });
          }
        } catch {
          // نادیده گرفتن کلیدهای غیرمرتبط
        }
      }
      if (brainModified) {
        ImportEngine.saveBrain(brain);
      }
    } catch {
      // ایمن‌سازی در برابر خطای استوریج
    }
    return result;
  }

  public static loadBrain(): Record<string, LearnedTokenEntry> {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
      const raw = localStorage.getItem(BRAIN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public static saveBrain(brain: Record<string, LearnedTokenEntry>): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(BRAIN_STORAGE_KEY, JSON.stringify(brain));
    } catch {
      // ignore quota errors
    }
  }

  private static extractSignificantTokens(text: string): string[] {
    const norm = normalizePersianText(text);
    if (!norm) return [];
    const stopWords = new Set([
      'از', 'به', 'در', 'با', 'برای', 'بابت', 'تا', 'روز', 'ماه', 'سال',
      'عدد', 'تومان', 'ریال', 'مبلغ', 'فی', 'جمع', 'کل', 'ردیف', 'شرح', 'فاکتور', 'تاریخ'
    ]);
    const words = norm
      .replace(/[0-9۰-۹.,\/\-()|]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !stopWords.has(w));

    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return [...bigrams, ...words];
  }

  public static learnFromCorrection(
    rowText: string,
    targetModule: ImportTargetModule,
    meta?: { profileId?: string; profileName?: string; projectId?: string; clientId?: string; entityType?: DetectedEntityType }
  ): void {
    if (!rowText || targetModule === 'UNKNOWN' || targetModule === 'IGNORE') return;
    const brain = ImportEngine.loadBrain();
    const tokens = ImportEngine.extractSignificantTokens(rowText);

    tokens.forEach(token => {
      const existing = brain[token];
      const isSameModule = existing?.module === targetModule;
      brain[token] = {
        module: targetModule,
        profileId: meta?.profileId || existing?.profileId,
        profileName: meta?.profileName || existing?.profileName,
        projectId: meta?.projectId || existing?.projectId,
        clientId: meta?.clientId || existing?.clientId,
        entityType: meta?.entityType || existing?.entityType,
        weight: isSameModule ? Math.min((existing?.weight || 20) + 12, 90) : 30,
        updatedAt: Date.now()
      };
    });

    ImportEngine.saveBrain(brain);
  }

  public static learnFromBatch(rows: ParsedRow[]): void {
    const brain = ImportEngine.loadBrain();
    rows.forEach(row => {
      if (row._targetModule === 'UNKNOWN' || row._targetModule === 'IGNORE') return;
      const fullText = `${row.title} ${row.typeDetail}`;
      const tokens = ImportEngine.extractSignificantTokens(fullText);
      tokens.slice(0, 6).forEach(token => {
        const existing = brain[token];
        if (!existing || existing.module === row._targetModule) {
          brain[token] = {
            module: row._targetModule,
            profileId: row.linkedProfileId || existing?.profileId,
            profileName: row.linkedProfileName || existing?.profileName,
            projectId: row.linkedProjectId || existing?.projectId,
            clientId: row.linkedClientId || existing?.clientId,
            entityType: row.detectedEntityType || existing?.entityType,
            weight: Math.min((existing?.weight || 12) + 6, 85),
            updatedAt: Date.now()
          };
        }
      });
    });
    ImportEngine.saveBrain(brain);
  }

  // ============================================================================
  // 🔍 بخش ۲: کشف متادیتا از نام فایل، شیت‌ها و سربرگ‌های اکسل
  // ============================================================================
  public analyzeMetadataForProject(metadataTexts: string[], availableProjects: any[]): string | null {
    const combinedText = normalizePersianText(metadataTexts.join(' ').toLowerCase());
    let bestMatchId: string | null = null;
    let maxLen = 0;

    const projectsToScan = availableProjects?.length ? availableProjects : this.masterData.projects;
    for (const proj of projectsToScan) {
      const pName = normalizePersianText(proj.title || proj.name || '');
      if (pName && pName.length > 2 && combinedText.includes(pName.toLowerCase())) {
        if (pName.length > maxLen) {
          maxLen = pName.length;
          bestMatchId = String(proj.id);
        }
      }
    }
    return bestMatchId;
  }

  public analyzeMetadataForContext(metadataTexts: string[]): {
    projectId?: string;
    clientId?: string;
    workerId?: string;
    vehicleId?: string;
    toolId?: string;
    supplierId?: string;
  } {
    const combined = normalizePersianText(metadataTexts.join(' '));
    const res: any = {};

    const projId = this.analyzeMetadataForProject(metadataTexts, this.masterData.projects);
    if (projId) res.projectId = projId;

    for (const client of this.masterData.clients) {
      const cName = normalizePersianText(`${client.name || ''} ${client.lastName || ''}`);
      if (cName.length > 3 && combined.includes(cName)) {
        res.clientId = String(client.id);
        break;
      }
    }

    for (const worker of this.masterData.workers) {
      const wName = normalizePersianText(`${worker.name || ''} ${worker.lastName || ''}`);
      if (wName.length > 3 && combined.includes(wName)) {
        res.workerId = String(worker.id);
        break;
      }
    }

    for (const vehicle of this.masterData.vehicles) {
      const vName = normalizePersianText(vehicle.name || vehicle.model || '');
      if (vName.length > 2 && combined.includes(vName)) {
        res.vehicleId = String(vehicle.id);
        break;
      }
    }

    for (const tool of this.masterData.tools) {
      const tName = normalizePersianText(tool.name || '');
      if (tName.length > 2 && combined.includes(tName)) {
        res.toolId = String(tool.id);
        break;
      }
    }

    for (const sup of this.masterData.suppliers) {
      const sName = normalizePersianText(sup.name || sup.shopName || '');
      if (sName.length > 3 && combined.includes(sName)) {
        res.supplierId = String(sup.id);
        break;
      }
    }

    return res;
  }

  // ============================================================================
  // ⚡ بخش ۳: پردازشگر اکسل‌های به‌هم‌ریخته و تفکیک‌کننده ردیف‌های ترکیبی
  // ============================================================================
  public processRawExcel(rawData: any[], colMapping: Record<string, string>): ParsedRow[] {
    const results: ParsedRow[] = [];
    let currentGroupId = `GROUP_${Date.now()}_0`;
    let syntheticIndex = 0;
    const seenSignatures = new Set<string>();

    const stickyContext: StickyContextState = {
      lastValidDate: moment().format('jYYYY/jMM/jDD')
    };

    rawData.forEach((row, rawIdx) => {
      const allCellValues = Object.entries(row)
        .filter(([k]) => !k.startsWith('_'))
        .map(([, v]) => normalizePersianText(v))
        .filter(Boolean);

      if (allCellValues.length === 0) return;

      const entireRowText = allCellValues.join(' | ');

      // ۱. فیلتر فوترها و جمع کل‌ها
      const footerRegex = /^(مهر و امضا|صفحه\s*\d+|گزارش جامع|مشخصات فاکتور|خلاصه وضعیت|مبنای محاسبه|مبلغ نهایی فاکتور|مانده نهایی|امضای کارفرما|امضای پیمانکار)$/i;
      if (entireRowText.length < 2 || footerRegex.test(entireRowText.trim())) return;

      if (/^(جمع کل|مجموع کل|جمع صفحه|جمع این صفحه|total|subtotal)/i.test(entireRowText.trim())) {
        currentGroupId = `GROUP_${Date.now()}_${rawIdx}`;
        return;
      }

      // ۲. استخراج اولیه از ستون‌های مپ‌شده
      let rawDate = colMapping.date ? row[colMapping.date] : '';
      let rawTitle = colMapping.title ? normalizePersianText(row[colMapping.title]) : '';
      let rawType = colMapping.type ? normalizePersianText(row[colMapping.type]) : '';
      const rawPercentage = colMapping.percentage ? row[colMapping.percentage] : '';
      const rawNotes = colMapping.notes ? normalizePersianText(row[colMapping.notes]) : '';

      let qty = colMapping.qty ? extractAmountStrict(row[colMapping.qty], false).amount : 0;
      const unitPriceData = colMapping.unitPrice ? extractAmountStrict(row[colMapping.unitPrice], true) : { amount: 0, currency: 'TOMAN' as const };
      let unitPrice = unitPriceData.amount;
      const amountData = colMapping.amount ? extractAmountStrict(row[colMapping.amount], true) : { amount: 0, currency: 'TOMAN' as const };
      let amount = amountData.amount;

      // ۳. اسکنر تمام‌ردیفه (Omni-Row Recovery)
      if (!rawDate || this.parsePersianStrictDate(String(rawDate)).needsVerification) {
        const recoveredDate = this.findDateAnywhereInRow(allCellValues);
        if (recoveredDate) rawDate = recoveredDate;
      }

      if (amount === 0) {
        const inlineMath = this.extractInlineMathAndAmount(entireRowText, row, colMapping);
        if (inlineMath.amount > 0) amount = inlineMath.amount;
        if (qty === 0 && inlineMath.qty > 0) qty = inlineMath.qty;
        if (unitPrice === 0 && inlineMath.unitPrice > 0) unitPrice = inlineMath.unitPrice;
      }

      if (qty === 0) qty = 1;
      if (amount === 0 && qty > 0 && unitPrice > 0) {
        amount = qty * unitPrice;
      }
      if (unitPrice === 0 && qty > 1 && amount > 0) {
        unitPrice = Math.round(amount / qty);
      }

      if (!rawTitle) {
        const textCells = allCellValues.filter(cell => {
          const eng = toEnglishDigits(cell).replace(/[,.\s]/g, '');
          return isNaN(Number(eng)) && !/^\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(eng);
        });
        rawTitle = textCells.slice(0, 2).join(' - ');
        if (!rawType && textCells.length > 2) {
          rawType = textCells.slice(2).join(' | ');
        }
      }

      const fullText = normalizePersianText(`${rawTitle} ${rawType} ${rawNotes} ${entireRowText}`);
      const fullTextEnglishDigits = toEnglishDigits(fullText);

      // ۴. اگر ردیف فاقد مبلغ است، بررسی کن آیا یک «بنر توضیحی / سربرگ بخش» است؟
      if (amount === 0 && unitPrice === 0) {
        const updatedContext = this.tryUpdateStickyContextFromHeaderRow(fullText, stickyContext);
        if (updatedContext) {
          currentGroupId = `GROUP_${Date.now()}_${rawIdx}`;
          return;
        }
      }

      // ۵. پردازش تاریخ همراه با حافظه آخرین تاریخ معتبر
      const parsedDate = this.parsePersianStrictDate(String(rawDate), stickyContext.lastValidDate);
      if (!parsedDate.needsVerification) {
        stickyContext.lastValidDate = parsedDate.date;
      }

      const detectedCurrency: 'TOMAN' | 'RIAL' =
        amountData.currency === 'RIAL' || unitPriceData.currency === 'RIAL' || /ریال|rial/i.test(fullText)
          ? 'RIAL'
          : 'TOMAN';

      let unit = '-';
      for (const u of EXTRACTABLE_UNITS) {
        const regex = new RegExp(`(\\d+|\\s|^)${u}(\\s|$|\\.|،)`, 'i');
        if (regex.test(fullText)) {
          unit = u;
          break;
        }
      }

      const rowIndex = syntheticIndex++;
      const parsedRow: ParsedRow = {
        _index: rowIndex,
        _originalData: row,
        _targetModule: 'UNKNOWN',
        _confidence: 0,
        _groupId: currentGroupId,
        date: parsedDate.date,
        originalDateText: String(rawDate || ''),
        title: rawTitle || fullText.substring(0, 65),
        typeDetail: rawType,
        amount,
        qty,
        unitPrice,
        unit,
        percentageRaw: String(rawPercentage || ''),
        calculatedDiscount: 0,
        calculatedTax: 0,
        calculatedMarkup: 0,
        calculatedManagementFee: 0,
        calculatedGoodPerformance: 0,
        calculatedInsurance: 0,
        suggestedPhase: stickyContext.contextPhase || 'GENERAL',
        suggestedChequeStatus: null,
        suggestedSettlementStatus: 'SETTLED',
        detectedCurrency,
        linkedProjectId: stickyContext.contextProjectId,
        linkedClientId: stickyContext.contextClientId,
        needsUserAction: parsedDate.needsVerification ? ['VERIFY_DATE'] : [],
        linkedParentRowIndexes: [],
        validationErrors: [],
        isIntraFileDuplicate: false
      };

      if (parsedRow.amount === 0) parsedRow.validationErrors.push('مبلغ کل صفر یا نامشخص است.');
      if (!parsedRow.title && !parsedRow.typeDetail) parsedRow.validationErrors.push('شرح / عنوان رکورد خالی است.');

      this.extractHiddenData(parsedRow, fullTextEnglishDigits, fullText);
      this.runAdvancedFinancialAudit(parsedRow);
      this.classifyRowWithSelfLearning(parsedRow, fullText, stickyContext);

      const safeTitlePart = parsedRow.title ? parsedRow.title.substring(0, 24) : '';
      const safeTypePart = parsedRow.typeDetail ? parsedRow.typeDetail.substring(0, 14) : '';
      const signature = `${parsedRow.date}_${parsedRow.amount}_${safeTitlePart}_${safeTypePart}`;

      if (parsedRow.amount > 0 && seenSignatures.has(signature)) {
        parsedRow.needsUserAction.push('CONFIRM_DUPLICATE');
        parsedRow.validationErrors.push('رکورد مشابه در همین فایل اکسل یافت شد (تکراری درون‌فایلی).');
        parsedRow.isIntraFileDuplicate = true;
      }
      if (parsedRow.amount > 0) seenSignatures.add(signature);

      results.push(parsedRow);

      // ۶. کالبدشکافی ردیف‌های ترکیبی (اگر در دل یک ردیف خرید یا کارکرد، کرایه حمل یا مساعده جداگانه ذکر شده بود)
      const splitChild = this.tryExtractCompoundChildRow(parsedRow, fullTextEnglishDigits, () => syntheticIndex++);
      if (splitChild) {
        results.push(splitChild);
      }
    });

    this.linkRelationalRows(results);
    return results;
  }

  private tryExtractCompoundChildRow(
    parentRow: ParsedRow,
    engText: string,
    getNextIndex: () => number
  ): ParsedRow | null {
    // اگر ردیف اصلی خرید مصالح بود و در متن آن "+ کرایه حمل 450,000" هم نوشته شده بود
    if (parentRow._targetModule === 'PURCHASES') {
      const freightMatch = engText.match(/(?:\+|با|و)\s*(?:کرایه|حمل|باربری)\s*[:=]?\s*([\d,]{5,12})/i);
      if (freightMatch) {
        const freightAmt = extractAmountStrict(freightMatch[1], false).amount;
        if (freightAmt > 0 && freightAmt < parentRow.amount) {
          return {
            ...parentRow,
            _index: getNextIndex(),
            _targetModule: 'VEHICLE_FREIGHT',
            _subModule: 'VEHICLE_FREIGHT',
            _isSplitChild: true,
            title: `کرایه حمل مجزا (${parentRow.title.substring(0, 30)})`,
            typeDetail: 'استخراج خودکار از ردیف ترکیبی خرید',
            amount: freightAmt,
            qty: 1,
            unitPrice: freightAmt,
            unit: 'سرویس',
            linkedParentRowIndexes: [parentRow._index],
            needsUserAction: ['SHARED_LOGISTICS_COST'],
            validationErrors: []
          };
        }
      }
    }

    // اگر ردیف اصلی کارکرد روزانه کارگر بود و در همان خط "+ مساعده 500,000" هم نوشته شده بود
    if (parentRow._targetModule === 'LABOR') {
      const advMatch = engText.match(/(?:\+|با|و)\s*(?:مساعده|پرداختی|دریافتی)\s*[:=]?\s*([\d,]{5,12})/i);
      if (advMatch) {
        const advAmt = extractAmountStrict(advMatch[1], false).amount;
        if (advAmt > 0 && advAmt !== parentRow.amount) {
          return {
            ...parentRow,
            _index: getNextIndex(),
            _targetModule: 'FINANCE',
            _subModule: 'FINANCE',
            _isSplitChild: true,
            title: `مساعده همراه کارکرد (${parentRow.linkedProfileName || parentRow.title.substring(0, 25)})`,
            typeDetail: 'پرداخت مساعده مستخرج از ردیف ترکیبی',
            amount: advAmt,
            qty: 1,
            unitPrice: advAmt,
            unit: 'فقره',
            linkedParentRowIndexes: [parentRow._index],
            needsUserAction: [],
            validationErrors: []
          };
        }
      }
    }

    return null;
  }

  private extractInlineMathAndAmount(
    entireRowText: string,
    rawRow: any,
    colMapping: Record<string, string>
  ): { amount: number; qty: number; unitPrice: number } {
    const engText = toEnglishDigits(entireRowText);
    let qty = 0;
    let unitPrice = 0;
    let amount = 0;

    const qtyMatch = engText.match(/(\d+(?:\.\d+)?)\s*(?:کیسه|پاکت|تن|سرویس|شاخه|متر|عدد|دستگاه|روز|ساعت|نفر|بار|ماشین|کورس)/i);
    if (qtyMatch) qty = parseFloat(qtyMatch[1]) || 0;

    const feeMatch = engText.match(/(?:فی|نرخ|واحد|هر\s*\S+)\s*[:=]?\s*([\d,]+(?:\.\d+)?)\s*(میلیون|هزار)?/i);
    if (feeMatch) {
      unitPrice = extractAmountStrict(`${feeMatch[1]} ${feeMatch[2] || ''}`, true).amount;
    }

    const totalMatch = engText.match(/(?:جمع|مبلغ|کل|پرداختی|کرایه|فاکتور)\s*[:=]?\s*([\d,]+(?:\.\d+)?)\s*(میلیون|هزار|ریال|تومان)?/i);
    if (totalMatch) {
      amount = extractAmountStrict(`${totalMatch[1]} ${totalMatch[2] || ''}`, true).amount;
    }

    if (amount === 0) {
      const candidateNumbers: number[] = [];
      Object.entries(rawRow).forEach(([k, val]) => {
        if (k.startsWith('_') || k === colMapping.date) return;
        const extracted = extractAmountStrict(val, false).amount;
        if (extracted >= 5000 && extracted < 900000000000) {
          candidateNumbers.push(extracted);
        }
      });
      if (candidateNumbers.length > 0) {
        amount = Math.max(...candidateNumbers);
      }
    }

    return { amount, qty, unitPrice };
  }

  private findDateAnywhereInRow(cells: string[]): string | null {
    for (const cell of cells) {
      const eng = toEnglishDigits(cell);
      const slashMatch = eng.match(/\b(13\d{2}|14\d{2}|\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
      if (slashMatch) return slashMatch[0];

      for (const monthName of Object.keys(PERSIAN_MONTHS)) {
        if (cell.includes(monthName)) return cell;
      }
    }
    return null;
  }

  private tryUpdateStickyContextFromHeaderRow(fullText: string, ctx: StickyContextState): boolean {
    let matchedSomething = false;

    const projHit = this.fuseEngines.projects.search(fullText);
    if (projHit.length > 0 && (projHit[0].score || 1) < 0.25) {
      ctx.contextProjectId = String(projHit[0].item.id);
      matchedSomething = true;
    }

    const clientHit = this.fuseEngines.clients.search(fullText);
    if (clientHit.length > 0 && (clientHit[0].score || 1) < 0.25) {
      ctx.contextClientId = String(clientHit[0].item.id);
      matchedSomething = true;
    }

    const workerHit = this.fuseEngines.workers.search(fullText);
    if (workerHit.length > 0 && (workerHit[0].score || 1) < 0.25) {
      ctx.contextWorkerId = String(workerHit[0].item.id);
      ctx.contextWorkerName = `${workerHit[0].item.name || ''} ${workerHit[0].item.lastName || ''}`.trim();
      matchedSomething = true;
    }

    const toolHit = this.fuseEngines.tools.search(fullText);
    if (toolHit.length > 0 && (toolHit[0].score || 1) < 0.25) {
      ctx.contextToolId = String(toolHit[0].item.id);
      ctx.contextToolName = toolHit[0].item.name;
      matchedSomething = true;
    }

    const vehicleHit = this.fuseEngines.vehicles.search(fullText);
    if (vehicleHit.length > 0 && (vehicleHit[0].score || 1) < 0.25) {
      ctx.contextVehicleId = String(vehicleHit[0].item.id);
      ctx.contextVehicleName = vehicleHit[0].item.name || vehicleHit[0].item.model;
      matchedSomething = true;
    }

    for (const [kw, ph] of Object.entries(PHASE_DICTIONARY)) {
      if (fullText.includes(kw)) {
        ctx.contextPhase = ph;
        matchedSomething = true;
        break;
      }
    }

    const dateInHeader = this.findDateAnywhereInRow([fullText]);
    if (dateInHeader) {
      const parsed = this.parsePersianStrictDate(dateInHeader, ctx.lastValidDate);
      if (!parsed.needsVerification) {
        ctx.lastValidDate = parsed.date;
        matchedSomething = true;
      }
    }

    return matchedSomething;
  }

  private extractHiddenData(row: ParsedRow, textDigits: string, textPersian: string) {
    const cardMatch = textDigits.match(/\b(6037|5022|6219|5892|6104|6273|5029|6274|5859|6393|6395|6280)\d{12}\b/);
    if (cardMatch) row.extractedCardNumber = cardMatch[0];

    const ibanMatch = textDigits.match(/\bIR\d{24}\b/i);
    if (ibanMatch) row.extractedIban = ibanMatch[0].toUpperCase();

    const hasChequeContext = /چک|صیاد|صیادی|بانک|شعبه|حساب|سررسید/i.test(textPersian);
    const sayyadMatch = textDigits.match(/\b\d{16}\b/);
    if (sayyadMatch && !cardMatch && hasChequeContext) {
      row.extractedChequeSayyad = sayyadMatch[0];
    }

    const phoneMatch = textDigits.match(/\b09\d{9}\b/);
    if (phoneMatch) row.extractedPhone = phoneMatch[0];

    const nationalIdMatch = textDigits.match(/\b(?!09)\d{10}\b/);
    if (nationalIdMatch && !phoneMatch && !hasChequeContext) {
      row.extractedNationalId = nationalIdMatch[0];
    }

    const plateMatch = textDigits.match(/\b\d{2}\s*[الف-ی]\s*\d{3}(?:\s*ایران\s*\d{2})?\b/);
    if (plateMatch) row.extractedPlate = plateMatch[0];

    const serialMatch = textDigits.match(/\b(?:SN|کد|سریال|اموال)[\s:\-]*([A-Z0-9\-]{3,15})\b/i);
    if (serialMatch) row.extractedSerial = serialMatch[1];

    const odoMatch = textDigits.match(/(?:کیلومتر|کارکرد|ساعت\s*کارکرد)\s*[:=]?\s*(\d{2,7})/i);
    if (odoMatch) row.extractedOdometer = Number(odoMatch[1]);

    if (/پاس شد|وصول شد|نقد شد/.test(textPersian)) row.suggestedChequeStatus = 'CASHED';
    else if (/برگشت|برگشتی/.test(textPersian)) row.suggestedChequeStatus = 'BOUNCED';
    else if (/در جریان|نزد بانک|در انتظار/.test(textPersian)) row.suggestedChequeStatus = 'PENDING';
    else if (/عودت|استرداد/.test(textPersian)) row.suggestedChequeStatus = 'RETURNED';

    if (/نسیه|مانده|بدهی|پرداخت نشده|معوق|طلب/.test(textPersian)) {
      row.suggestedSettlementStatus = 'PENDING';
    } else if (/علی الحساب|پیش پرداخت|بیعانه|بخشی از|ناقص|نصفه/.test(textPersian)) {
      row.suggestedSettlementStatus = 'PARTIAL';
    } else {
      row.suggestedSettlementStatus = 'SETTLED';
    }
  }

  private runAdvancedFinancialAudit(row: ParsedRow) {
    const expectedAmount = row.qty * row.unitPrice;
    const explicitPercentage = parsePercentage(row.percentageRaw);

    if (row.unitPrice > 0 && expectedAmount > 0 && expectedAmount !== row.amount) {
      const diff = row.amount - expectedAmount;
      const ratio = diff / expectedAmount;

      if (diff > 0) {
        let isTax = false;
        for (const taxRate of this.standardTaxRates) {
          if (Math.abs(ratio - taxRate) < 0.015 || Math.abs(explicitPercentage - taxRate * 100) < 0.2) {
            row.calculatedTax = diff;
            isTax = true;
            if (taxRate === 0.10) row.needsUserAction.push('CONFIRM_TAX_OR_FEE');
            break;
          }
        }
        if (!isTax) {
          row.calculatedManagementFee = diff;
          row.calculatedMarkup = diff;
        }
      } else {
        const absRatio = Math.abs(ratio);
        const absDiff = Math.abs(diff);

        if (Math.abs(absRatio - 0.10) < 0.015 || Math.abs(explicitPercentage - -10) < 0.2) {
          row.calculatedGoodPerformance = absDiff;
        } else if (Math.abs(absRatio - 0.05) < 0.015 || Math.abs(absRatio - 0.07) < 0.015 || Math.abs(absRatio - 0.1667) < 0.015) {
          row.calculatedInsurance = absDiff;
        } else {
          row.calculatedDiscount = absDiff;
        }
      }
    } else if (expectedAmount > 0 && expectedAmount === row.amount && explicitPercentage !== 0) {
      row.needsUserAction.push('PERCENTAGE_NOT_APPLIED_IN_TOTAL');
      row.validationErrors.push('درصد/تخفیف ذکر شده در مبلغ نهایی اعمال نشده است.');
    }
  }

  // ============================================================================
  // 🧠 بخش ۴: موتور طبقه‌بندی چندلایه (ابزار، خودرو، تعمیرات، بیمه، سرویس، کارگر، خرید، مالی)
  // ============================================================================
  private classifyRowWithSelfLearning(row: ParsedRow, fullText: string, ctx: StickyContextState) {
    const scores: Record<ImportTargetModule, number> = {
      FINANCE: 0,
      LABOR: 0,
      LABOR_MONTHLY: 0,
      LABOR_MISC: 0,
      PURCHASES: 0,
      LOGISTICS: 0,
      VEHICLE_FREIGHT: 0,
      TOOL_RENTAL: 0,
      LOGISTICS_REPAIR: 0,
      LOGISTICS_SERVICE: 0,
      LOGISTICS_INSURANCE: 0,
      LOGISTICS_MISC: 0,
      LOGISTICS_DRIVER: 0,
      INVENTORY: 0,
      IGNORE: 0,
      UNKNOWN: 0
    };

    const phaseScores: Record<ProjectPhaseGuess, number> = { EXCAVATION: 0, STRUCTURE: 0, ROUGHING: 0, FINISHING: 0, GENERAL: 0 };
    for (const [keyword, phase] of Object.entries(PHASE_DICTIONARY)) {
      if (fullText.includes(keyword)) phaseScores[phase]++;
    }
    const bestPhase = Object.keys(phaseScores).reduce((a, b) =>
      phaseScores[a as ProjectPhaseGuess] > phaseScores[b as ProjectPhaseGuess] ? a : b
    ) as ProjectPhaseGuess;
    row.suggestedPhase = phaseScores[bestPhase] > 0 ? bestPhase : ctx.contextPhase || 'GENERAL';

    // اعمال حافظه عصبی خودآموز
    const tokens = ImportEngine.extractSignificantTokens(fullText);
    tokens.forEach(token => {
      const learned = this.learnedBrain[token];
      if (learned) {
        scores[learned.module] = (scores[learned.module] || 0) + learned.weight;
        row.isLearnedMatch = true;
        if (learned.profileId && !row.linkedProfileId) {
          row.linkedProfileId = learned.profileId;
          row.linkedProfileName = learned.profileName;
        }
        if (learned.projectId && !row.linkedProjectId) row.linkedProjectId = learned.projectId;
        if (learned.clientId && !row.linkedClientId) row.linkedClientId = learned.clientId;
        if (learned.entityType && !row.detectedEntityType) row.detectedEntityType = learned.entityType;
      }
    });

    // تطبیق فازی با پروفایل‌های واقعی در دیتابیس
    const toolHit = this.fuseEngines.tools.search(fullText);
    if (toolHit.length > 0 && (toolHit[0].score || 1) < 0.28) {
      row.detectedEntityType = 'TOOL';
      row.linkedToolId = String(toolHit[0].item.id);
      row.linkedProfileId = String(toolHit[0].item.id);
      row.linkedProfileName = toolHit[0].item.name;
      scores.TOOL_RENTAL += 48;
      scores.LOGISTICS += 40;
    } else if (ctx.contextToolId) {
      row.detectedEntityType = 'TOOL';
      row.linkedToolId = ctx.contextToolId;
      row.linkedProfileId = ctx.contextToolId;
      row.linkedProfileName = ctx.contextToolName;
    }

    const vehicleHit = this.fuseEngines.vehicles.search(fullText);
    if (vehicleHit.length > 0 && (vehicleHit[0].score || 1) < 0.28) {
      row.detectedEntityType = 'VEHICLE';
      row.linkedVehicleId = String(vehicleHit[0].item.id);
      row.linkedProfileId = String(vehicleHit[0].item.id);
      row.linkedProfileName = vehicleHit[0].item.name || vehicleHit[0].item.model;
      row.isInternalAsset = vehicleHit[0].item.isInternal ?? true;
      scores.VEHICLE_FREIGHT += 48;
      scores.LOGISTICS += 45;
    } else if (ctx.contextVehicleId && !row.linkedToolId) {
      row.detectedEntityType = 'VEHICLE';
      row.linkedVehicleId = ctx.contextVehicleId;
      row.linkedProfileId = ctx.contextVehicleId;
      row.linkedProfileName = ctx.contextVehicleName;
    }

    const workerHit = this.fuseEngines.workers.search(fullText);
    if (workerHit.length > 0 && (workerHit[0].score || 1) < 0.28) {
      const wName = `${workerHit[0].item.name || ''} ${workerHit[0].item.lastName || ''}`.trim();
      row.linkedWorkerId = String(workerHit[0].item.id);
      if (!row.linkedProfileId) {
        row.linkedProfileId = String(workerHit[0].item.id);
        row.linkedProfileName = wName;
        row.detectedEntityType = 'WORKER';
      }
      scores.LABOR += 58;
    } else if (ctx.contextWorkerId && !row.linkedWorkerId) {
      row.linkedWorkerId = ctx.contextWorkerId;
      if (!row.linkedProfileName) row.linkedProfileName = ctx.contextWorkerName;
    }

    const supplierHit = this.fuseEngines.suppliers.search(fullText);
    if (supplierHit.length > 0 && (supplierHit[0].score || 1) < 0.28) {
      row.linkedSupplierId = String(supplierHit[0].item.id);
      if (!row.linkedProfileId) {
        row.linkedProfileId = String(supplierHit[0].item.id);
        row.linkedProfileName = supplierHit[0].item.name || supplierHit[0].item.shopName;
      }
      if (!row.detectedEntityType) row.detectedEntityType = 'SUPPLIER';
      if (supplierHit[0].item.category === 'repairShop' || /تعمیرگاه|تراشکاری|مکانیکی/.test(fullText)) {
        scores.LOGISTICS_REPAIR += 52;
      } else {
        scores.PURCHASES += 48;
      }
    }

    const inventoryHit = this.fuseEngines.inventory.search(fullText);
    if (inventoryHit.length > 0 && (inventoryHit[0].score || 1) < 0.28) {
      if (!row.linkedProfileId) {
        row.linkedProfileId = String(inventoryHit[0].item.id);
        row.linkedProfileName = inventoryHit[0].item.title || inventoryHit[0].item.name;
      }
      scores.PURCHASES += 42;
    }

    const projHit = this.fuseEngines.projects.search(fullText);
    if (projHit.length > 0 && (projHit[0].score || 1) < 0.28) {
      row.linkedProjectId = String(projHit[0].item.id);
    }

    // الف) تشخیص ابزارآلات و اجاره ابزار
    if (/دریل|فرز|مینی فرز|بتن کن|چکش تخریب|هیلتی|پیکور|موتور برق|ژنراتور|کفکش|لجن کش|ویبراتور|کمپرسور|تراز لیزری|دوربین نقشه برداری|پروفیل بر|اره عمودبر|بکس بادی|دستگاه جوش|اینورتر|بالابر کارگاهی|کاتر آسفالت|کمپکتور|قالب فلزی|جک سقفی|داربست/i.test(fullText)) {
      if (!row.detectedEntityType) row.detectedEntityType = 'TOOL';
      scores.TOOL_RENTAL += 42;
      scores.LOGISTICS += 35;
    }

    if (/اجاره دستگاه|اجاره ابزار|کرایه ابزار|کرایه دریل|کرایه هیلتی|کرایه بالابر|کرایه موتور برق|تمدید اجاره|اعزام اپراتور/i.test(fullText)) {
      row.detectedEntityType = 'TOOL';
      scores.TOOL_RENTAL += 75;
      scores.LOGISTICS += 55;
    }

    // ب) تشخیص تعمیرات تخصصی (خودرو و ابزار)
    if (/تعمیر|تعمیرات|مکانیکی|تراشکاری|اورهال|تعویض قطعه|داغی|گیربکس|موتور سوزی|سیم پیچی|آرمیچر|بالشتک|کلگی|پمپ هیدرولیک|جلوبندی|زیربندی|دیسک و صفحه|بلبرینگ|واشر سرسیلندر|تعمیرگاه|خرابی دستگاه|شکستگی شاسی/i.test(fullText)) {
      scores.LOGISTICS_REPAIR += 78;
      scores.LOGISTICS += 60;
    }

    // ج) تشخیص سرویس و خدمات دوره‌ای
    if (/سرویس دوره ای|تعویض روغن|فیلتر روغن|فیلتر هوا|فیلتر گازوئیل|لنت ترمز|واسکازین|گریس کاری|ضدیخ رادیاتور|تعویض ذغال|کلکتور|تیزکاری مته|کالیبراسیون|آچارکشی/i.test(fullText)) {
      scores.LOGISTICS_SERVICE += 78;
      scores.LOGISTICS += 60;
    }

    // د) تشخیص بیمه و گارانتی
    if (/بیمه شخص ثالث|بیمه بدنه|بیمه مسئولیت|تمدید بیمه|قسط بیمه|بیمه ایران|بیمه آسیا|بیمه البرز|بیمه دانا|بیمه پاسارگاد|گارانتی دستگاه|معاینه فنی/i.test(fullText)) {
      scores.LOGISTICS_INSURANCE += 82;
      scores.LOGISTICS += 60;
    }

    // هـ) تشخیص هزینه‌های جانبی لجستیک
    if (/عوارض آزادراه|عوارض شهرداری|جریمه راهنمایی|خلافی خودرو|کارواش|پارکینگ|سوخت|گازوئیل|بنزین|پنچرگیری|آپارات|کپسول آتش نشانی/i.test(fullText)) {
      scores.LOGISTICS_MISC += 72;
      scores.LOGISTICS += 55;
    }

    // و) تشخیص باربری خودرو و ماشین‌آلات سنگین
    if (/باربری|بارنامه|حمل بار|کرایه حمل|سرویس بار|کمپرسی|خاور|ایسوزو|نیسان|وانت|تریلی|کمرشکن|ده چرخ|تراک میکسر|پمپ بتن|لودر|بیل مکانیکی|بابکت|جرثقیل|تراکتور|غلتک|گریدر/i.test(fullText)) {
      if (!row.detectedEntityType) row.detectedEntityType = 'VEHICLE';
      scores.VEHICLE_FREIGHT += 68;
      scores.LOGISTICS += 60;
    }

    // ز) تشخیص مالی، چک و تراکنش‌ها
    if (/دریافتی|پرداختی|واریز|تسویه حساب|چک صیادی|کارتخوان|حواله|شبا|تنخواه|صندوق|مساعده|پیش پرداخت|علی الحساب|پایا|ساتنا|کارت به کارت|قسط|شارژ حساب|بیعانه|ضمانت|سفته/i.test(fullText)) {
      scores.FINANCE += 58;
    }

    // ح) تشخیص نیروی کار
    if (/رفاهی|غذا|ناهار|شام|صبحانه|پاداش|تشویقی|عیدی|سنوات|جریمه کارگر|کسر کار|غیبت|لباس کار|کفش ایمنی|کلاه ایمنی|انعام|کرایه راه کارگر|اسکان|خوابگاه/i.test(fullText)) {
      scores.LABOR_MISC += 68;
    }

    if (/قرارداد ماهانه|حقوق ماهانه|ماهیانه|حقوق ثابت|فیش حقوقی|حق اولاد|حق مسکن|بن کارگری|سهم بیمه کارفرما|سهم بیمه کارگر/i.test(fullText)) {
      scores.LABOR_MONTHLY += 68;
    }

    if (/کارگر|بنا|دستمزد|نیرو|شاگرد|جوشکار|روزمزد|سنگ کار|استادکار|نقاش|برقکار|لوله کش|سیم کش|کاشی کار|گچ کار|نجار|آرماتوربند|بتن ریز|نگهبان|سرکارگر|مقنی|چاه کن|داربست بند|آهنگر|شیفت کاری|کارکرد روزانه|روزکرد|اضافه کار|قالب بند|اپراتور/i.test(fullText)) {
      scores.LABOR += 52;
    }

    // ط) تشخیص خرید مصالح و انبار
    if (/ورود به انبار|خروج از انبار|موجودی انبار|برگشت به انبار|انبارگردانی|حواله انبار|رسید انبار/i.test(fullText)) {
      scores.INVENTORY += 72;
      scores.PURCHASES += 50;
    }

    if (/سیمان|آهن|شن|ماسه|میلگرد|تیرآهن|لوله|خرید مصالح|فاکتور خرید|آجر|کاشی|گچ|سرامیک|شیرآلات|کابل|سیم|چسب|پودر سنگ|قوطی|پروفیل|ورق|پیچ و مهره|میخ|چوب|تخته|شیشه|درب و پنجره|عایق|فوم|موزاییک|پارکت|نبشی|ناودانی|سفال|بلوک|پوکه|ایزوگام|قیر|گونی|رابیتس|کناف|الکترود|صفحه برش|چسب بتن|روان کننده|ضدیخ بتن|اسپیسر|واتراستاپ|خاموت|تیرچه|یونولیت|رنگ و تینر/i.test(fullText)) {
      scores.PURCHASES += 58;
    }

    let bestModule: ImportTargetModule = 'UNKNOWN';
    let maxScore = 0;

    (Object.keys(scores) as ImportTargetModule[]).forEach(mod => {
      if (scores[mod] > maxScore) {
        maxScore = scores[mod];
        bestModule = mod;
      }
    });

    if (maxScore > 0) {
      row._subModule = bestModule;
      row._targetModule = bestModule;
      row._confidence = Math.min(Math.round(maxScore * 1.25), 100);
    } else {
      row._targetModule = 'UNKNOWN';
      row._confidence = 10;
      row.validationErrors.push('سیستم قادر به تشخیص ماهیت این رکورد نشد؛ لطفاً بخش مربوطه را از لیست انتخاب کنید.');
    }

    if (
      (row._targetModule === 'LOGISTICS' ||
        row._targetModule === 'VEHICLE_FREIGHT' ||
        row._targetModule === 'TOOL_RENTAL' ||
        row._targetModule === 'LOGISTICS_REPAIR' ||
        row._targetModule === 'LOGISTICS_SERVICE' ||
        row._targetModule === 'LOGISTICS_INSURANCE' ||
        row._targetModule === 'LOGISTICS_MISC') &&
      !row.linkedProfileId
    ) {
      row.needsUserAction.push('SELECT_VEHICLE_OR_EXTERNAL');
    }

    if (
      (row._targetModule === 'LABOR' || row._targetModule === 'LABOR_MONTHLY' || row._targetModule === 'LABOR_MISC') &&
      !row.linkedWorkerId &&
      !row.linkedProfileId
    ) {
      row.needsUserAction.push('SELECT_WORKER_PROFILE');
    }
  }

  // ============================================================================
  // 📅 بخش ۵: مفسر تاریخ شمسی منعطف
  // ============================================================================
  public parsePersianStrictDate(rawDate: string, fallbackDate?: string): { date: string; needsVerification: boolean } {
    const defaultDate = fallbackDate || moment().format('jYYYY/jMM/jDD');
    const text = toEnglishDigits(normalizePersianText(rawDate));
    if (!text) return { date: defaultDate, needsVerification: true };

    const fullMatch = text.match(/\b(13\d{2}|14\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
    if (fullMatch) {
      const formatted = `${fullMatch[1]}/${fullMatch[2].padStart(2, '0')}/${fullMatch[3].padStart(2, '0')}`;
      const m = moment(formatted, 'jYYYY/jMM/jDD', true);
      if (m.isValid()) return { date: m.format('jYYYY/jMM/jDD'), needsVerification: false };
    }

    const shortYearMatch = text.match(/\b(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
    if (shortYearMatch) {
      const yearNum = Number(shortYearMatch[1]);
      const fullYear = yearNum >= 70 ? `13${shortYearMatch[1]}` : `14${shortYearMatch[1]}`;
      const formatted = `${fullYear}/${shortYearMatch[2].padStart(2, '0')}/${shortYearMatch[3].padStart(2, '0')}`;
      const m = moment(formatted, 'jYYYY/jMM/jDD', true);
      if (m.isValid()) return { date: m.format('jYYYY/jMM/jDD'), needsVerification: false };
    }

    for (const [monthName, monthNum] of Object.entries(PERSIAN_MONTHS)) {
      if (text.includes(monthName)) {
        const yearMatch = text.match(/\b(13\d{2}|14\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : moment().format('jYYYY');
        const dayMatch = text.replace(year, '').match(/\b([1-9]|[12]\d|3[01])\b/);
        const day = dayMatch ? dayMatch[1].padStart(2, '0') : '01';
        const candidate = `${year}/${monthNum}/${day}`;
        const m = moment(candidate, 'jYYYY/jMM/jDD', true);
        if (m.isValid()) {
          return { date: m.format('jYYYY/jMM/jDD'), needsVerification: !dayMatch };
        }
      }
    }

    return { date: defaultDate, needsVerification: true };
  }

  private linkRelationalRows(rows: ParsedRow[]) {
    const groupMap = new Map<string, ParsedRow[]>();
    for (const r of rows) {
      if (!r._groupId) continue;
      if (!groupMap.has(r._groupId)) groupMap.set(r._groupId, []);
      groupMap.get(r._groupId)!.push(r);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (
        (row._targetModule === 'LOGISTICS' || row._targetModule === 'VEHICLE_FREIGHT') &&
        /حمل|کرایه|باربری|تخلیه|بارگیری/.test(row.title + row.typeDetail)
      ) {
        if (row._groupId && groupMap.has(row._groupId)) {
          const parentPurchases = groupMap
            .get(row._groupId)!
            .filter(r => r._targetModule === 'PURCHASES' && r._index < row._index);
          if (parentPurchases.length > 0) {
            row.linkedParentRowIndexes = parentPurchases.map(p => p._index);
            if (!row.needsUserAction.includes('SHARED_LOGISTICS_COST')) {
              row.needsUserAction.push('SHARED_LOGISTICS_COST');
            }
          }
        }
      }
    }
  }
}