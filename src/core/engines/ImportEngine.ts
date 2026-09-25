import Fuse from 'fuse.js';
import moment from 'moment-jalaali';

export type ImportTargetModule = 'FINANCE' | 'LABOR' | 'PURCHASES' | 'LOGISTICS' | 'LABOR_MONTHLY' | 'LABOR_MISC' | 'IGNORE' | 'UNKNOWN';
export type ProjectPhaseGuess = 'EXCAVATION' | 'STRUCTURE' | 'ROUGHING' | 'FINISHING' | 'GENERAL';
export type ChequeStatusGuess = 'CASHED' | 'PENDING' | 'BOUNCED' | 'RETURNED' | null;

export interface ParsedRow {
  _index: number;
  _originalData: any;
  _targetModule: ImportTargetModule;
  _confidence: number;
  _groupId?: string; 
  
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
  calculatedManagementFee: number; 
  calculatedGoodPerformance: number; 
  calculatedInsurance: number; 
  
  extractedCardNumber?: string;
  extractedIban?: string;
  extractedChequeSayyad?: string;
  extractedNationalId?: string; 
  extractedPhone?: string;
  suggestedPhase: ProjectPhaseGuess; 
  suggestedChequeStatus: ChequeStatusGuess; 
  detectedCurrency: 'TOMAN' | 'RIAL'; 
  
  linkedProfileId?: string; 
  isInternalAsset?: boolean; 
  
  needsUserAction: string[]; 
  linkedParentRowIndexes?: number[]; 
  validationErrors: string[];
  isIntraFileDuplicate?: boolean;
}

interface SystemMasterData {
  workers: any[];
  vehicles: any[];
  inventory: any[];
  clients: any[];
  activeTaxRates?: number[]; 
}

const PERSIAN_MONTHS: Record<string, string> = {
  'فروردین': '01', 'اردیبهشت': '02', 'خرداد': '03', 'تیر': '04', 'تیرماه': '04',
  'مرداد': '05', 'شهریور': '06', 'مهر': '07', 'آبان': '08', 
  'آذر': '09', 'دی': '10', 'بهمن': '11', 'اسفند': '12'
};

// 💡 دیکشنری واحدهای اندازه‌گیری فوق‌العاده گسترده شده
const EXTRACTABLE_UNITS = [
  'پاکت', 'کیسه', 'تن', 'کیلو', 'کیلوگرم', 'گرم', 'سرویس', 'ماشین', 'شاخه', 'متر', 'مترطول', 'مترمکعب', 
  'مترمربع', 'طول', 'عدد', 'بسته', 'دستگاه', 'لیتر', 'گالن', 'کارتن', 'حلقه', 'رول', 
  'تخته', 'قوطی', 'جین', 'جفت', 'ست', 'پالت', 'بند', 'جام', 'قالب', 'دست', 'شیفت',
  'نفر', 'نفر-روز', 'ساعت', 'کامیون', 'طاقه', 'برگ', 'گونی', 'حلب', 'بشکه', 'شیت', 'توپ'
];

// 💡 دیکشنری فازهای ساختمانی هوشمندتر و ریزتر شده (۵ برابر کلمه بیشتر)
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
  'قرنیز': 'FINISHING', 'آینه کاری': 'FINISHING', 'موکت': 'FINISHING', 'یراق آلات': 'FINISHING', 'آیفون تصویری': 'FINISHING'
};

const normalizePersianText = (text: string) => {
  if (!text) return '';
  return String(text).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200B-\u200D\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim();
};

const toEnglishDigits = (str: string) => String(str).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

const extractAmountStrict = (val: any, isCurrencyCell: boolean = false): { amount: number, currency: 'TOMAN' | 'RIAL' } => {
  if (!val && val !== 0) return { amount: 0, currency: 'TOMAN' };
  
  const strVal = String(val).toLowerCase();
  const strEngDigits = toEnglishDigits(strVal);
  const cleanString = strEngDigits.replace(/,/g, '').replace(/[^0-9.-]+/g, ""); 
  let numVal = Number(cleanString) || 0;

  let currency: 'TOMAN' | 'RIAL' = 'TOMAN';
  let multiplier = 1;

  if (strVal.includes('ریال') || strVal.includes('rial')) {
    multiplier = 0.1; 
    currency = 'RIAL';
  } 
  
  if (isCurrencyCell) {
    if (strVal.includes('هزار')) multiplier *= 1000;
    if (strVal.includes('میلیون')) multiplier *= 1000000;
  }

  return { amount: numVal * multiplier, currency };
};

const parsePercentage = (val: any): number => {
  if (!val) return 0;
  const str = toEnglishDigits(String(val));
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

export class ImportEngine {
  private masterData: SystemMasterData;
  private fuseEngines: { workers: Fuse<any>; vehicles: Fuse<any>; inventory: Fuse<any>; };
  private standardTaxRates: number[];

  constructor(masterData: SystemMasterData) {
    this.masterData = masterData;
    this.standardTaxRates = masterData.activeTaxRates || [0.09, 0.10]; 
    
    this.fuseEngines = {
      workers: new Fuse(masterData.workers, { keys: ['name', 'lastName', 'specialty'], threshold: 0.3, includeScore: true }),
      vehicles: new Fuse(masterData.vehicles, { keys: ['name', 'plate', 'type'], threshold: 0.3, includeScore: true }),
      inventory: new Fuse(masterData.inventory, { keys: ['title', 'category'], threshold: 0.3, includeScore: true })
    };
  }

  public analyzeMetadataForProject(metadataTexts: string[], availableProjects: any[]): string | null {
    const combinedText = metadataTexts.join(' ').toLowerCase();
    const normalizedText = normalizePersianText(combinedText);
    
    let bestMatchId: string | null = null;
    let maxLen = 0;

    for (const proj of availableProjects) {
      const pName = normalizePersianText(proj.title || proj.name || '');
      if (pName && pName.length > 2 && normalizedText.includes(pName)) {
        if (pName.length > maxLen) {
          maxLen = pName.length;
          bestMatchId = String(proj.id);
        }
      }
    }

    return bestMatchId;
  }

  public processRawExcel(rawData: any[], colMapping: Record<string, string>): ParsedRow[] {
    const results: ParsedRow[] = [];
    let currentGroupId = `GROUP_${Date.now()}_0`; 
    
    const seenSignatures = new Set<string>();

    rawData.forEach((row, idx) => {
      const rawDate = row[colMapping.date] || '';
      const rawTitle = normalizePersianText(row[colMapping.title]);
      const rawType = normalizePersianText(row[colMapping.type]);
      const rawPercentage = colMapping.percentage ? row[colMapping.percentage] : '';
      const rawNotes = colMapping.notes ? normalizePersianText(row[colMapping.notes]) : '';
      
      const fullText = `${rawTitle} ${rawType} ${rawNotes}`.trim();
      const fullTextEnglishDigits = toEnglishDigits(fullText);
      
      const footerRegex = /مهر و امضا|صفحه|گزارش|ردیف|مشخصات فاکتور|خلاصه وضعیت|مبنای محاسبه|مبلغ نهایی|مانده نهایی|دریافتی از کارفرما|هزینه‌های قطعی|امضای کارفرما|امضای پیمانکار/i;
      
      if (fullText.length < 2 || footerRegex.test(fullText)) return; 

      if (/جمع|مجموع|total/i.test(fullText)) {
        currentGroupId = `GROUP_${Date.now()}_${idx}`;
        return; 
      }

      let qty = extractAmountStrict(row[colMapping.qty], false).amount || 1;
      const unitPriceData = extractAmountStrict(row[colMapping.unitPrice], true);
      let unitPrice = unitPriceData.amount || 0;
      const amountData = extractAmountStrict(row[colMapping.amount], true);
      let amount = amountData.amount || (qty * unitPrice);

      let detectedCurrency = amountData.currency === 'RIAL' || unitPriceData.currency === 'RIAL' ? 'RIAL' : 'TOMAN';
      
      let unit = '-';
      EXTRACTABLE_UNITS.forEach(u => { if (fullText.includes(u)) unit = u; });

      let parsedDate = this.parsePersianStrictDate(String(rawDate));
      
      const parsedRow: ParsedRow = {
        _index: idx,
        _originalData: row,
        _targetModule: 'UNKNOWN',
        _confidence: 0,
        _groupId: currentGroupId,
        date: parsedDate.date,
        originalDateText: String(rawDate),
        title: rawTitle,
        typeDetail: rawType,
        amount,
        qty,
        unitPrice,
        unit,
        percentageRaw: String(rawPercentage),
        calculatedDiscount: 0,
        calculatedTax: 0,
        calculatedManagementFee: 0,
        calculatedGoodPerformance: 0,
        calculatedInsurance: 0,
        suggestedPhase: 'GENERAL',
        suggestedChequeStatus: null,
        detectedCurrency: detectedCurrency as 'TOMAN' | 'RIAL',
        needsUserAction: parsedDate.needsVerification ? ['VERIFY_DATE'] : [],
        linkedParentRowIndexes: [],
        validationErrors: [],
        isIntraFileDuplicate: false
      };

      if (parsedRow.amount === 0) parsedRow.validationErrors.push('مبلغ کل صفر یا نامشخص است.');
      if (!parsedRow.title && !parsedRow.typeDetail) parsedRow.validationErrors.push('شرح / عنوان رکورد خالی است.');
      if (parsedDate.needsVerification && parsedDate.date === moment().format('jYYYY/jMM/jDD')) {
         parsedRow.validationErrors.push('تاریخ معتبر یافت نشد (استفاده از تاریخ امروز).');
      }

      this.extractHiddenData(parsedRow, fullTextEnglishDigits, fullText);
      this.runAdvancedFinancialAudit(parsedRow);
      this.classifyRow(parsedRow, fullText);

      const safeTitlePart = parsedRow.title ? parsedRow.title.substring(0, 20) : '';
      const safeTypePart = parsedRow.typeDetail ? parsedRow.typeDetail.substring(0, 10) : '';
      const signature = `${parsedRow.date}_${parsedRow.amount}_${safeTitlePart}_${safeTypePart}`;
      
      if (seenSignatures.has(signature)) {
        parsedRow.needsUserAction.push('CONFIRM_DUPLICATE');
        parsedRow.validationErrors.push('رکورد مشابه در همین فایل اکسل یافت شد (تکراری درون‌فایلی).');
        parsedRow.isIntraFileDuplicate = true;
      }
      seenSignatures.add(signature);

      results.push(parsedRow);
    });

    this.linkRelationalRows(results);
    return results;
  }

  private extractHiddenData(row: ParsedRow, textDigits: string, textPersian: string) {
    const cardMatch = textDigits.match(/\b(6037|5022|6219|5892|6104|6273|5029|6274|5859)\d{12}\b/);
    if (cardMatch) row.extractedCardNumber = cardMatch[0];

    const ibanMatch = textDigits.match(/\bIR\d{24}\b/i);
    if (ibanMatch) row.extractedIban = ibanMatch[0].toUpperCase();

    const hasChequeContext = /چک|صیاد|صیادی|بانک|شعبه|حساب/i.test(textPersian);
    const sayyadMatch = textDigits.match(/\b\d{16}\b/);
    if (sayyadMatch && !cardMatch && hasChequeContext) {
       row.extractedChequeSayyad = sayyadMatch[0];
    }

    const phoneMatch = textDigits.match(/\b09\d{9}\b/);
    if (phoneMatch) row.extractedPhone = phoneMatch[0];

    const nationalIdMatch = textDigits.match(/\b(?!09)\d{10}\b/);
    if (nationalIdMatch && !phoneMatch && !hasChequeContext) row.extractedNationalId = nationalIdMatch[0];

    if (textPersian.includes('پاس شد') || textPersian.includes('وصول')) row.suggestedChequeStatus = 'CASHED';
    else if (textPersian.includes('برگشت') || textPersian.includes('برگشتی')) row.suggestedChequeStatus = 'BOUNCED';
    else if (textPersian.includes('در جریان') || textPersian.includes('نزد بانک')) row.suggestedChequeStatus = 'PENDING';
    else if (textPersian.includes('عودت')) row.suggestedChequeStatus = 'RETURNED';
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
          if (Math.abs(ratio - taxRate) < 0.01 || Math.abs(explicitPercentage - (taxRate*100)) < 0.1) {
            row.calculatedTax = diff;
            isTax = true;
            if (taxRate === 0.10) row.needsUserAction.push('CONFIRM_TAX_OR_FEE');
            break;
          }
        }
        if (!isTax) row.calculatedManagementFee = diff; 
      } else { 
        const absRatio = Math.abs(ratio);
        const absDiff = Math.abs(diff);

        if (Math.abs(absRatio - 0.10) < 0.01 || Math.abs(explicitPercentage - -10) < 0.1) row.calculatedGoodPerformance = absDiff;
        else if (Math.abs(absRatio - 0.05) < 0.01 || Math.abs(absRatio - 0.1667) < 0.01) row.calculatedInsurance = absDiff; 
        else row.calculatedDiscount = absDiff; 
      }
    } 
    else if (expectedAmount > 0 && expectedAmount === row.amount && explicitPercentage !== 0) {
       row.needsUserAction.push('PERCENTAGE_NOT_APPLIED_IN_TOTAL');
       row.validationErrors.push('درصد/تخفیف ذکر شده در مبلغ نهایی اعمال نشده است.');
    }
  }

  // ----------------------------------------------------
  // 🧠 موتور اصلی طبقه‌بندی با الگوریتم‌های فوق‌گسترده
  // ----------------------------------------------------
  private classifyRow(row: ParsedRow, fullText: string) {
    let scores = { FINANCE: 0, LABOR: 0, LABOR_MONTHLY: 0, LABOR_MISC: 0, PURCHASES: 0, LOGISTICS: 0 };
    
    const phaseScores: Record<ProjectPhaseGuess, number> = { EXCAVATION: 0, STRUCTURE: 0, ROUGHING: 0, FINISHING: 0, GENERAL: 0 };
    for (const [keyword, phase] of Object.entries(PHASE_DICTIONARY)) {
      if (fullText.includes(keyword)) { phaseScores[phase]++; }
    }
    const bestPhase = Object.keys(phaseScores).reduce((a, b) => phaseScores[a as ProjectPhaseGuess] > phaseScores[b as ProjectPhaseGuess] ? a : b) as ProjectPhaseGuess;
    row.suggestedPhase = phaseScores[bestPhase] > 0 ? bestPhase : 'GENERAL';

    const workerHit = this.fuseEngines.workers.search(fullText);
    if (workerHit.length > 0 && (workerHit[0].score || 1) < 0.3) {
      scores.LABOR += 60;
      row.linkedProfileId = workerHit[0].item.id;
      row.title = `${workerHit[0].item.name} ${workerHit[0].item.lastName}`; 
    }

    const vehicleHit = this.fuseEngines.vehicles.search(fullText);
    if (vehicleHit.length > 0 && (vehicleHit[0].score || 1) < 0.3) {
      scores.LOGISTICS += 60;
      row.linkedProfileId = vehicleHit[0].item.id;
      row.isInternalAsset = vehicleHit[0].item.isInternal; 
    }

    const inventoryHit = this.fuseEngines.inventory.search(fullText);
    if (inventoryHit.length > 0 && (inventoryHit[0].score || 1) < 0.3) {
      scores.PURCHASES += 40;
      row.linkedProfileId = inventoryHit[0].item.id;
    }

    // 💡 دیکشنری‌های بی‌نهایت گسترده برای درک مطلب ۱۰۰ درصدی
    
    if (/دریافتی|پرداختی|واریز|تسویه|چک|کارتخوان|نقد|حواله|شبا|تنخواه|صندوق|مساعده|پیش پرداخت|علی الحساب|پایا|ساتنا|کارت به کارت|اقساط|قسط|شارژ|بیعانه|ضمانت|سفته|برات/i.test(fullText)) {
      scores.FINANCE += 50;
    }

    if (/رفاهی|غذا|ناهار|شام|صبحانه|پاداش|تشویقی|عیدی|سنوات|جریمه|کسر کار|کسری|غیبت|لباس کار|کفش ایمنی|تجهیزات فردی|کلاه ایمنی|بیمه کارگر|هزینه پزشکی|خسارت|انعام|شیرینی|کرایه راه|بلیط|پزشکی|خلافی|اسکان|خوابگاه/i.test(fullText)) {
      scores.LABOR_MISC += 50;
    }

    if (/مدیریت پیمان|قرارداد|ماهیانه|ماهانه|حقوق پایه|فیش حقوقی|درصد پیشرفت|صورت وضعیت|کنترات|حق الزحمه|مقطوع|توافقی|دستمزد ماهانه|حق اولاد|حق مسکن|بن کارگری/i.test(fullText)) {
      scores.LABOR_MONTHLY += 50;
    }

    if (/کارگر|بنا|دستمزد|نیرو|شاگرد|جوشکار|روزمزد|سنگ‌کار|استادکار|نقاش|برقکار|تاسیسات|لوله کش|سیم کش|کاشی کار|گچ کار|نجار|آرماتوربند|بتن ریز|نگهبان|سرکارگر|ناظر|مهندس|مقنی|چاه کن|گچکار|رابیتس کار|نماکار|ایزوگام کار|داربست|شیشه بر|کابینت کار|نصاب|آهنگر|شیفت|کارکرد|روزکرد|نصف روز|اضافه کار|شب کار|پیمانکار|روز مزد|دستمزد روزانه|قالب بند|عایق کار|نقشه بردار|اپراتور/i.test(fullText)) {
      scores.LABOR += 40;
    }

    if (/کرایه|حمل|باربری|آژانس|اسنپ|تپسی|ماکسیم|لودر|بیل|کمپرسی|جرثقیل|پیک|وانت|نیسان|کامیون|تریلی|تراکتور|آژور|خاور|ایسوزو|ده چرخ|کمرشکن|بابکت|مینی بیل|پمپ بتن|میکسر|تراک میکسر|هزینه ایاب و ذهاب|پیک موتوری|ترانزیت|بارنامه|تاور|جرثقیل سقفی|غلتک|گریدر/i.test(fullText)) {
      scores.LOGISTICS += 40;
    }

    if (/سیمان|آهن|شن|ماسه|میلگرد|لوله|خرید|فاکتور|شیلنگ|شلینگ|آجر|کاشی|گچ|ابزار|سرامیک|تجهیزات|توالت|شیر|روشویی|فلاش تانک|کاسه|حمام|فرنگی|پریز|کابل|سیم|لامپ|چسب|پودر سنگ|قوطی|پروفیل|ورق|پیچ|مهره|میخ|چوب|تخته|شیشه|درب|پنجره|عایق|فوم|پمپ|موتور|آسانسور|موزاییک|پارکت|قرنیز|نبشی|ناودانی|سپری|تیغه|سفال|بلوک|پوکه|ایزوگام|قیر|گونی|رابیتس|کناف|هالوژن|لوستر|دستکش|متر|فرز|دریل|الکترود|سنگ فرز|صفحه برش|چسب بتن|روان کننده|ضدیخ|اسپیسر|واتراستاپ|خاموت|سنجاقی|خرپا|تیرچه|یونولیت|رنگ|تینر|بتونه|سمباده|غلطک|قلم مو|فرغون|بیل|کلنگ|سطل|طناب|قرقره|بالابر|افزودنی|فوم بتن|کناف|پی وی سی/i.test(fullText)) {
      scores.PURCHASES += 35;
    }

    let maxScore = Math.max(...Object.values(scores));
    
    if (maxScore > 0) {
      row._targetModule = Object.keys(scores).find(k => (scores as any)[k] === maxScore) as ImportTargetModule;
      row._confidence = Math.min(maxScore * 1.5, 100);
    } else {
      row._targetModule = 'UNKNOWN'; 
      row._confidence = 10;
      row.validationErrors.push('سیستم قادر به تشخیص ماهیت این رکورد (مالی، نیروی کار، خرید و...) نشد.');
    }

    if (row._targetModule === 'LOGISTICS' && !row.linkedProfileId) {
      row.needsUserAction.push('SELECT_VEHICLE_OR_EXTERNAL');
    }
    if ((row._targetModule === 'LABOR' || row._targetModule === 'LABOR_MONTHLY' || row._targetModule === 'LABOR_MISC') && !row.linkedProfileId) {
      row.needsUserAction.push('SELECT_WORKER_PROFILE');
    }
  }

  private parsePersianStrictDate(rawDate: string): { date: string, needsVerification: boolean } {
    const text = toEnglishDigits(rawDate.trim());
    if (!text) return { date: moment().format('jYYYY/jMM/jDD'), needsVerification: true };
    
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
       const m = moment(text, 'jYYYY/jMM/jDD', true);
       if (m.isValid()) return { date: m.format('jYYYY/jMM/jDD'), needsVerification: false };
    }

    const rangeMatch = text.match(/تا (\d{1,2}) ([\u0600-\u06FF]+)/);
    if (rangeMatch) {
      const day = rangeMatch[1].padStart(2, '0');
      const monthNum = PERSIAN_MONTHS[rangeMatch[2].trim()];
      if (monthNum) {
         const m = moment(`${moment().format('jYYYY')}/${monthNum}/${day}`, 'jYYYY/jMM/jDD', true);
         if (m.isValid()) return { date: m.format('jYYYY/jMM/jDD'), needsVerification: true }; 
      }
    }

    const textParts = text.split(' ');
    for (let i = 0; i < textParts.length; i++) {
      const monthNum = PERSIAN_MONTHS[textParts[i].trim()];
      if (monthNum) {
        const yearMatch = text.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : moment().format('jYYYY');
        const m = moment(`${year}/${monthNum}/01`, 'jYYYY/jMM/jDD', true);
        if (m.isValid()) return { date: m.format('jYYYY/jMM/jDD'), needsVerification: true }; 
      }
    }

    return { date: moment().format('jYYYY/jMM/jDD'), needsVerification: true };
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
      if (row._targetModule === 'LOGISTICS' && /حمل|کرایه|باربری|تخلیه|بارگیری/.test(row.title + row.typeDetail)) {
        if (row._groupId && groupMap.has(row._groupId)) {
          const parentPurchases = groupMap.get(row._groupId)!.filter(r => r._targetModule === 'PURCHASES' && r._index < row._index);
          if (parentPurchases.length > 0) {
            row.linkedParentRowIndexes = parentPurchases.map(p => p._index);
            row.needsUserAction.push('SHARED_LOGISTICS_COST'); 
          }
        }
      }
    }
  }
}