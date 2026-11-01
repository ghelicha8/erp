import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, Edit3, Eye, Check, Save, Plus, Trash2, 
  Building2, UserCheck, ShieldCheck, Scale, FileText, 
  Stamp, Sparkles, CheckSquare, Download, Share2,
  Copy, RefreshCw, Layout, FileCode, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment-jalaali';

import type { Contract } from '../../../store/contractStore';
import { 
  useContractStore, 
  calculateFinalContractAmount, 
  calculateRetentionAmount,
  DEFAULT_CONTRACT_TEMPLATE 
} from '../../../store/contractStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { formatCurrency } from '../../../core/utils/currency';
import { numberToPersianWords } from '../../../core/utils/numToPersian';

interface OfficialContractPrintViewProps {
  contract: Contract;
  onClose?: () => void;
}

// تگ‌های هوشمند در دسترس برای قالب‌ساز
const AVAILABLE_TAGS = [
  { tag: '{{نام_کارفرما}}', label: 'نام کارفرما', desc: 'نام کارفرما یا اسامی شرکا' },
  { tag: '{{لیست_کامل_کارفرمایان}}', label: 'لیست کامل کارفرمایان', desc: 'متن حقوقی با گرامر مفرد/جمع، کدملی و تلفن' },
  { tag: '{{کد_ملی_کارفرما}}', label: 'کد ملی کارفرما', desc: 'کد ملی کارفرما(یان)' },
  { tag: '{{تلفن_کارفرما}}', label: 'تلفن کارفرما', desc: 'شماره تماس کارفرما' },
  { tag: '{{نام_شرکت_پیمانکاری}}', label: 'شرکت پیمانکاری', desc: 'نام شرکت یا برند ثبت‌شده' },
  { tag: '{{نام_پیمانکار}}', label: 'نام پیمانکار', desc: 'نام مجری یا نمایندگان پیمانکار' },
  { tag: '{{لیست_کامل_پیمانکاران}}', label: 'لیست کامل پیمانکاران', desc: 'متن حقوقی با گرامر مفرد/جمع، سمت و کدملی' },
  { tag: '{{کد_ملی_پیمانکار}}', label: 'کد ملی پیمانکار', desc: 'کد ملی یا شناسه پیمانکار' },
  { tag: '{{نام_پروژه}}', label: 'نام پروژه', desc: 'نام پروژه متصل' },
  { tag: '{{فاز_پروژه}}', label: 'فاز پروژه', desc: 'نام فاز در صورت اختصاصی بودن' },
  { tag: '{{آدرس_پروژه}}', label: 'آدرس پروژه', desc: 'نشانی کارگاه پروژه' },
  { tag: '{{نوع_کارکرد}}', label: 'نوع کارکرد / موضوع', desc: 'شرح موضوع یا مدل قرارداد' },
  { tag: '{{مبلغ_یا_درصد_قرارداد}}', label: 'مبلغ یا درصد کارمزد', desc: 'مبلغ کل یا درصد پیمان مدیریت' },
  { tag: '{{مبلغ_به_حروف}}', label: 'مبلغ به حروف', desc: 'تبدیل خودکار به حروف فارسی' },
  { tag: '{{تاریخ_عقد}}', label: 'تاریخ عقد', desc: 'تاریخ رسمی انعقاد' },
  { tag: '{{تاریخ_شروع}}', label: 'تاریخ شروع', desc: 'تاریخ آغاز عملیات' },
  { tag: '{{تاریخ_پایان}}', label: 'تاریخ پایان', desc: 'سررسید یا اتمام کامل عملیات' },
  { tag: '{{مدت_قرارداد}}', label: 'مدت قرارداد', desc: 'بازه زمانی شروع تا پایان یا اتمام کار' },
  { tag: '{{لیست_شاهدین}}', label: 'لیست شاهدین', desc: 'متن هوشمند گواهی شهود با کدملی' },
];

/**
 * مفسر هوشمند تگ‌های قالب قرارداد با تطبیق گرامر مفرد و جمع
 */
export function interpretContractTemplate(
  template: string,
  contract: Contract,
  settings: any
): string {
  if (!template) return '';

  const finalAmount = calculateFinalContractAmount(contract);

  // ۱. پردازش کارفرمایان با گرامر مفرد/جمع
  const employers = contract.employers && contract.employers.length > 0
    ? contract.employers
    : contract.partyName
    ? [{ id: 'p1', name: contract.partyName, phone: contract.partyPhone, address: contract.location }]
    : [];

  const employerCount = employers.length;
  const employerName = employerCount > 0
    ? employers.map(e => e.name).join('، ')
    : contract.partyName || 'کارفرما';

  const employerNationalId = employers.map(e => e.nationalId).filter(Boolean).join('، ') || '---';
  const employerPhone = employers.map(e => e.phone).filter(Boolean).join(' - ') || contract.partyPhone || '---';

  let fullEmployersText = '';
  if (employerCount === 1) {
    const e = employers[0];
    fullEmployersText = `جناب آقای/سرکار خانم/شرکت ${e.name}${e.nationalId ? ` به شماره ملی / شناسه ثبت ${e.nationalId}` : ''}${e.phone ? ` به شماره تلفن ${e.phone}` : ''}${e.address ? ` به نشانی ${e.address}` : ''} به عنوان طرف دوم / کارفرما`;
  } else if (employerCount > 1) {
    fullEmployersText = `کارفرمایان محترم: ${employers
      .map((e, idx) => `${(idx + 1).toLocaleString('fa-IR')}. آقای/خانم ${e.name}${e.nationalId ? ` (کد ملی: ${e.nationalId})` : ''}${e.phone ? ` (تلفن: ${e.phone})` : ''}${e.address ? ` (نشانی: ${e.address})` : ''}`)
      .join(' و ')} که مشترکاً و متضامناً در این قرارداد طرف دوم / «کارفرما» نامیده می‌شوند`;
  } else {
    fullEmployersText = `جناب آقای/شرکت ${contract.partyName || 'طرف حساب'}${contract.partyPhone ? ` به شماره تلفن ${contract.partyPhone}` : ''} به عنوان طرف دوم / کارفرما`;
  }

  // ۲. پردازش پیمانکاران و شرکت مجری
  const contractorCompany = contract.companyBrandName || contract.contractorCompany || settings.companyName || 'شرکت مهندسی و پیمانکاری پیمان';
  const contractors = contract.contractors && contract.contractors.length > 0 ? contract.contractors : [];
  const contractorCount = contractors.length;

  const contractorName = contractorCount > 0
    ? contractors.map(c => c.name).join('، ')
    : contractorCompany;

  const contractorNationalId = contractors.map(c => c.nationalId).filter(Boolean).join('، ') || settings.nationalId || '---';

  let fullContractorsText = '';
  if (contractorCount === 1) {
    const c = contractors[0];
    fullContractorsText = `جناب آقای/خانم ${c.name}${c.nationalId ? ` به شماره ملی ${c.nationalId}` : ''}${c.phone ? ` به تلفن ${c.phone}` : ''}${c.role ? ` با سمت ${c.role}` : ''} به نمایندگی از ${contractorCompany} به عنوان طرف اول / مجری و پیمانکار`;
  } else if (contractorCount > 1) {
    fullContractorsText = `${contractorCompany} به نمایندگی آقایان/خانم‌ها: ${contractors
      .map((c, idx) => `${(idx + 1).toLocaleString('fa-IR')}. ${c.name}${c.nationalId ? ` (کد ملی: ${c.nationalId})` : ''}${c.phone ? ` (تلفن: ${c.phone})` : ''}${c.role ? ` (سمت: ${c.role})` : ''}`)
      .join(' و ')} که مشترکاً و متضامناً در این قرارداد طرف اول / «پیمانکار» نامیده می‌شوند`;
  } else {
    fullContractorsText = `${contractorCompany} به شماره ثبت ${settings.registrationNumber || '---'} و شناسه ملی ${settings.nationalId || '---'} به عنوان طرف اول / پیمانکار`;
  }

  // ۳. مشخصات پروژه و فاز
  const projectName = contract.projectName || 'پروژه عمومی';
  const phaseText = contract.scopeType === 'SPECIFIC_PHASE' && contract.phaseName
    ? `(مربوط به فاز اختصاصی: ${contract.phaseName})`
    : '';
  const projectAddress = contract.location || 'کارگاه پروژه واقع در نشانی اعلامی کارفرما';

  // ۴. نوع کارکرد و مبالغ
  const workType = contract.subject || contract.title || 'عملیات ساختمانی و پیمانکاری';
  const isManagement = contract.pricingModel === 'PERCENTAGE_MANAGEMENT';
  const contractAmountOrPercent = isManagement
    ? `${contract.managementFeePercent || 0} درصد کارمزد مدیریت پیمان`
    : `${finalAmount.toLocaleString('fa-IR')}`;
  const amountWords = isManagement
    ? `${numberToPersianWords(contract.managementFeePercent || 0)} درصد`
    : `${numberToPersianWords(finalAmount)}`;

  // ۵. تاریخ‌ها و مدت زمان با حذف هوشمند موارد خالی
  const contractDate = contract.startDate || moment().format('jYYYY/jMM/jDD');
  const hasStart = contract.hasStartDate !== false && !!contract.startDate;
  const hasEnd = contract.hasEndDate !== false && !!(contract.currentEndDate || contract.initialEndDate);

  const startDate = hasStart ? contract.startDate : 'آغاز از زمان ابلاغ کتبی';
  const endDate = hasEnd ? (contract.currentEndDate || contract.initialEndDate) : 'اتمام کامل عملیات موضوع پیمان';

  let durationText = '';
  if (hasStart && hasEnd) {
    durationText = `از تاریخ ${startDate} لغایت ${endDate}`;
  } else if (hasStart && !hasEnd) {
    durationText = `از تاریخ ${startDate} لغایت اتمام کامل عملیات موضوع پیمان`;
  } else if (!hasStart && hasEnd) {
    durationText = `تا تاریخ سررسید ${endDate}`;
  } else {
    durationText = `از زمان ابلاغ کتبی لغایت اتمام کامل عملیات موضوع پیمان`;
  }

  // ۶. لیست شهود با گرامر مفرد/جمع و حذف خودکار در صورت نبود
  let witnessesText = '';
  const witnesses = contract.witnesses && contract.witnesses.length > 0 ? contract.witnesses : [];
  if (witnesses.length === 1) {
    const w = witnesses[0];
    witnessesText = `شهود قرارداد: جناب آقای/سرکار خانم ${w.name}${w.nationalId ? ` (کد ملی: ${w.nationalId})` : ''}${w.phone ? ` (تلفن: ${w.phone})` : ''} صحت و اصالت توافقات طرفین را گواهی می‌نماید.`;
  } else if (witnesses.length > 1) {
    witnessesText = `شهود قرارداد: ${witnesses
      .map((w, idx) => `${(idx + 1).toLocaleString('fa-IR')}. آقای/خانم ${w.name}${w.nationalId ? ` (کد ملی: ${w.nationalId})` : ''}${w.phone ? ` (تلفن: ${w.phone})` : ''}`)
      .join(' و ')} صحت و اصالت توافقات طرفین را گواهی می‌نمایند.`;
  }

  // نقشه تگ‌ها به مقادیر واقعی
  const tagMap: Record<string, string> = {
    '{{نام_کارفرما}}': employerName,
    '{{لیست_کامل_کارفرمایان}}': fullEmployersText,
    '{{کد_ملی_کارفرما}}': employerNationalId,
    '{{تلفن_کارفرما}}': employerPhone,
    '{{نام_شرکت_پیمانکاری}}': contractorCompany,
    '{{نام_پیمانکار}}': contractorName,
    '{{لیست_کامل_پیمانکاران}}': fullContractorsText,
    '{{کد_ملی_پیمانکار}}': contractorNationalId,
    '{{نام_پروژه}}': projectName,
    '{{فاز_پروژه}}': phaseText,
    '{{آدرس_پروژه}}': projectAddress,
    '{{نوع_کارکرد}}': workType,
    '{{مبلغ_یا_درصد_قرارداد}}': contractAmountOrPercent,
    '{{مبلغ_به_حروف}}': amountWords,
    '{{تاریخ_عقد}}': contractDate,
    '{{تاریخ_شروع}}': startDate,
    '{{تاریخ_پایان}}': endDate,
    '{{مدت_قرارداد}}': durationText,
    '{{لیست_شاهدین}}': witnessesText,
  };

  let result = template;
  for (const [tag, value] of Object.entries(tagMap)) {
    result = result.split(tag).join(value);
  }

  return result;
}

export default function OfficialContractPrintView({
  contract,
  onClose,
}: OfficialContractPrintViewProps) {
  const { updateContract, defaultTemplateText, setDefaultTemplateText } = useContractStore();
  const { settings } = useSettingsStore();

  const finalAmount = calculateFinalContractAmount(contract);
  const retentionAmount = calculateRetentionAmount(contract);

  // حالت‌های ویرایش و نوع نمایش
  const [isEditMode, setIsEditMode] = useState(false);
  const [templateMode, setTemplateMode] = useState<'ARTICLES' | 'CUSTOM_TEMPLATE'>(
    contract.templateMode || 'ARTICLES'
  );
  const [printMode, setPrintMode] = useState<'WITH_HEADER' | 'PLAIN_TEXT'>(
    contract.printMode || 'WITH_HEADER'
  );
  const [showSignature, setShowSignature] = useState(contract.showDigitalSignature ?? true);

  // متن قالب سفارشی تگ‌دار
  const [customTemplate, setCustomTemplate] = useState<string>(
    contract.customTemplateText || defaultTemplateText || DEFAULT_CONTRACT_TEMPLATE
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ساخت خودکار متن مواد پیش‌فرض با حذف موارد خالی
  const employers = contract.employers && contract.employers.length > 0
    ? contract.employers
    : contract.partyName
    ? [{ id: 'p1', name: contract.partyName, phone: contract.partyPhone, address: contract.location }]
    : [];

  const employerCount = employers.length;
  let employerNames = '';
  if (employerCount === 1) {
    const e = employers[0];
    employerNames = `جناب آقای/سرکار خانم/شرکت ${e.name}${e.nationalId ? ` (کد ملی: ${e.nationalId})` : ''}${e.phone ? ` به تلفن ${e.phone}` : ''}${e.address ? ` و نشانی ${e.address}` : ''}`;
  } else if (employerCount > 1) {
    employerNames = `کارفرمایان محترم: ${employers.map((e, idx) => `${(idx + 1).toLocaleString('fa-IR')}. آقای/خانم ${e.name}${e.nationalId ? ` (کد ملی: ${e.nationalId})` : ''}${e.phone ? ` (تلفن: ${e.phone})` : ''}`).join(' و ')} که مشترکاً و متضامناً طرف دوم قرارداد می‌باشند`;
  } else {
    employerNames = `جناب آقای/شرکت ${contract.partyName}${contract.partyPhone ? ` به تلفن ${contract.partyPhone}` : ''}`;
  }

  const contractorCompanyText = contract.contractorCompany ? `شرکت/برند ${contract.contractorCompany}` : (settings.companyName || 'شرکت مهندسی و پیمانکاری پیمان');
  const contractors = contract.contractors && contract.contractors.length > 0 ? contract.contractors : [];
  let contractorsListText = '';
  if (contractors.length === 1) {
    contractorsListText = ` به نمایندگی ${contractors[0].name}${contractors[0].nationalId ? ` (کد ملی: ${contractors[0].nationalId})` : ''}${contractors[0].role ? ` با سمت ${contractors[0].role}` : ''}`;
  } else if (contractors.length > 1) {
    contractorsListText = ` به نمایندگی آقایان: ${contractors.map((c, idx) => `${(idx + 1).toLocaleString('fa-IR')}. ${c.name}${c.nationalId ? ` (کد ملی: ${c.nationalId})` : ''}${c.role ? ` (سمت: ${c.role})` : ''}`).join(' و ')}`;
  }

  const scopeText = contract.scopeType === 'SPECIFIC_PHASE' && contract.phaseName
    ? ` (مربوط به فاز اختصاصی: ${contract.phaseName})`
    : '';

  // مدت قرارداد با حذف نامشخص و بررسی ۳ حالت تاریخ
  const hasStart = contract.hasStartDate !== false && !!contract.startDate;
  const hasEnd = contract.hasEndDate !== false && !!(contract.currentEndDate || contract.initialEndDate);
  const article3Text = hasStart && hasEnd
    ? `مدت زمان اجرای موضوع پیمان از تاریخ ${contract.startDate} لغایت ${contract.currentEndDate || contract.initialEndDate} تعیین می‌گردد. هرگونه تمدید مدت یا تعلیق کار مشروط به صدور متمم و الحاقیه کتبی و تأیید دستگاه نظارت خواهد بود.`
    : hasStart && !hasEnd
    ? `مدت زمان اجرای موضوع پیمان از تاریخ ${contract.startDate} لغایت اتمام کامل عملیات موضوع پیمان تعیین می‌گردد. هرگونه تمدید مدت یا تعلیق کار مشروط به صدور متمم و الحاقیه کتبی و تأیید دستگاه نظارت خواهد بود.`
    : !hasStart && hasEnd
    ? `مدت زمان اجرای موضوع پیمان تا تاریخ ${contract.currentEndDate || contract.initialEndDate} تعیین می‌گردد. هرگونه تمدید مدت یا تعلیق کار مشروط به صدور متمم و الحاقیه کتبی و تأیید دستگاه نظارت خواهد بود.`
    : `مدت زمان اجرای موضوع پیمان از زمان ابلاغ کتبی لغایت اتمام کامل عملیات موضوع پیمان تعیین می‌گردد. هرگونه تمدید مدت یا تعلیق کار مشروط به صدور متمم و الحاقیه کتبی و تأیید دستگاه نظارت خواهد بود.`;

  // مبلغ و پیش‌پرداخت
  const prepaymentText = contract.prepaymentAmount > 0
    ? ` مبلغ پیش‌پرداخت معادل ${contract.prepaymentAmount.toLocaleString('fa-IR')} تومان در ابتدای کار پرداخت گردیده و`
    : '';
  const article4Text = `مبلغ کل توافق‌شده قرارداد با احتساب متمم‌های مربوطه معادل ${finalAmount.toLocaleString('fa-IR')} تومان (به حروف: ${numberToPersianWords(finalAmount)} تومان) می‌باشد.${prepaymentText} مابقی مبالغ بر اساس پیشرفت فیزیکی، صورت‌وضعیت‌های ماهانه و تأیید مهندس ناظر تسویه خواهد شد.`;

  // کسورات قانونی با حذف خودکار موارد صفر
  const deductionsParts: string[] = [];
  if (contract.retentionPercent && contract.retentionPercent > 0) {
    deductionsParts.push(`از هر پرداخت صورت‌وضعیت، معادل ${contract.retentionPercent} درصد (مجموعاً به ارزش ${retentionAmount.toLocaleString('fa-IR')} تومان) به عنوان سپرده حسن انجام کار کسر گردیده و پس از تحویل موقت و تأیید ناظر ${contract.retentionReleaseDate ? `در تاریخ سررسید ${contract.retentionReleaseDate}` : 'در موعد مقرر'} مسترد خواهد شد.`);
  }
  const taxInsParts: string[] = [];
  if (contract.insurancePercent && contract.insurancePercent > 0) {
    taxInsParts.push(`کسر بیمه تأمین اجتماعی: ${contract.insurancePercent}٪`);
  }
  if (contract.taxPercent && contract.taxPercent > 0) {
    taxInsParts.push(`مالیات تکلیفی: ${contract.taxPercent}٪`);
  }
  if (taxInsParts.length > 0) {
    deductionsParts.push(`کسورات قانونی شامل: ${taxInsParts.join(' | ')} می‌باشد.`);
  }
  if (contract.guarantees && contract.guarantees.length > 0) {
    deductionsParts.push('همچنین طرف حساب تضامین معتبر جهت حسن انجام تعهدات نزد پیمانکار تودیع نموده است.');
  }

  const article5Text = deductionsParts.length > 0
    ? deductionsParts.join(' ')
    : 'این قرارداد فاقد هرگونه کسورات بیمه، مالیات یا سپرده حسن انجام کار می‌باشد و تسویه به صورت خالص انجام می‌پذیرد.';

  const defaultArticles = {
    article1: `این قرارداد در تاریخ ${contract.startDate || '---'} فی‌مابین ${contractorCompanyText} به شماره ثبت ${settings.registrationNumber || '---'} و شناسه ملی ${settings.nationalId || '---'} به نشانی ${settings.address || 'دفتر مرکزی شرکت'} و تلفن ${settings.phones?.filter(Boolean).join(' - ') || '---'}${contractorsListText} (طرف اول / پیمانکار)، و ${employerNames} (طرف دوم / کارفرما) منعقد و طرفین ملزم به رعایت کلیه مفاد و قوانین جاری کشور گردیدند.`,
    article2: `موضوع قرارداد عبارت است از: ${contract.subject || contract.title}${scopeText} مطابق با مشخصات فنی، نقشه‌های اجرایی مصوب و استانداردهای سازمان نظام مهندسی کشور. محل اجرای پروژه واقع در ${contract.location || 'کارگاه پروژه ' + (contract.projectName || 'مرکزی')} می‌باشد.`,
    article3: article3Text,
    article4: article4Text,
    article5: article5Text,
    article6: `پیمانکار موظف به رعایت کامل آیین‌نامه‌های حفاظت و بهداشت کار (HSE)، استفاده از کارگران دارای مهارت و تجهیزات ایمنی در کارگاه می‌باشد. خسارات احتمالی ناشی از عدم رعایت اصول ایمنی مستقیماً بر عهده شخص خاطی خواهد بود.`,
    article7: `در صورت بروز هرگونه تأخیر غیرمجاز، طرف متخلف به ازای هر روز تأخیر ملزم به پرداخت مبلغ ${contract.dailyDelayPenalty.toLocaleString('fa-IR')} تومان به عنوان خسارت دیرکرد می‌باشد. کلیه اختلافات احتمالی از طریق مذاکره و در صورت عدم حصول توافق، از طریق داوری حل و فصل خواهد شد.`,
  };

  // استیت‌های مواد قرارداد
  const [art1, setArt1] = useState(contract.contractArticles?.article1 || defaultArticles.article1);
  const [art2, setArt2] = useState(contract.contractArticles?.article2 || defaultArticles.article2);
  const [art3, setArt3] = useState(contract.contractArticles?.article3 || defaultArticles.article3);
  const [art4, setArt4] = useState(contract.contractArticles?.article4 || defaultArticles.article4);
  const [art5, setArt5] = useState(contract.contractArticles?.article5 || defaultArticles.article5);
  const [art6, setArt6] = useState(contract.contractArticles?.article6 || defaultArticles.article6);
  const [art7, setArt7] = useState(contract.contractArticles?.article7 || defaultArticles.article7);

  // تبصره‌ها و شروط اختصاصی
  const [customClauses, setCustomClauses] = useState<string[]>(
    contract.contractArticles?.customClauses || [
      'تبصره ۱: تهیه کلیه ابزارآلات و ماشین‌آلات اجرایی مطابق توافق بر عهده مجری خواهد بود.',
      'تبصره ۲: مصالح مازاد بر نیاز کارگاه پس از اتمام مرحله با صورتجلسه رسمی تعیین تکلیف می‌گردد.'
    ]
  );
  const [newClauseText, setNewClauseText] = useState('');

  // تفسیر زنده قالب تگ‌دار
  const renderedCustomText = useMemo(() => {
    return interpretContractTemplate(customTemplate, contract, settings);
  }, [customTemplate, contract, settings]);

  // درج تگ در موقعیت کرسر
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setCustomTemplate(prev => prev + ' ' + tag);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = customTemplate.substring(0, start);
    const after = customTemplate.substring(end);
    const next = before + tag + after;
    setCustomTemplate(next);
    setTimeout(() => {
      el.focus();
      const nextPos = start + tag.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  // بازیابی قالب پیش‌فرض سراسری
  const handleResetToDefaultTemplate = () => {
    setCustomTemplate(defaultTemplateText || DEFAULT_CONTRACT_TEMPLATE);
    toast.info('قالب پیش‌فرض سیستم بارگذاری شد');
  };

  // ذخیره به عنوان قالب پیش‌فرض سراسری
  const handleSaveAsGlobalDefaultTemplate = () => {
    setDefaultTemplateText(customTemplate);
    toast.success('این متن به عنوان قالب پیش‌فرض سراسری کل سیستم ذخیره شد');
  };

  // افزودن تبصره جدید
  const handleAddClause = () => {
    if (!newClauseText.trim()) return;
    setCustomClauses(prev => [...prev, newClauseText.trim()]);
    setNewClauseText('');
    toast.success('تبصره جدید به انتهای قرارداد اضافه شد');
  };

  const handleDeleteClause = (index: number) => {
    setCustomClauses(prev => prev.filter((_, idx) => idx !== index));
  };

  // ذخیره نهایی در پرونده قرارداد
  const handleSaveAll = () => {
    updateContract(contract.id, {
      templateMode,
      customTemplateText: customTemplate,
      printMode,
      contractArticles: {
        article1: art1,
        article2: art2,
        article3: art3,
        article4: art4,
        article5: art5,
        article6: art6,
        article7: art7,
        customClauses,
      },
      showDigitalSignature: showSignature,
    });
    setIsEditMode(false);
    toast.success('مفاد، قالب و تنظیمات چاپ رسمی در پرونده قرارداد ذخیره شد');
  };

  const handlePrint = () => {
    window.print();
  };

  // ساخت لیست طرفین برای باکس امضای داینامیک انتهای برگه
  const signatureParties = useMemo(() => {
    const list: Array<{
      id: string;
      roleTitle: string;
      name: string;
      nationalId?: string;
      phone?: string;
      type: 'CONTRACTOR' | 'EMPLOYER' | 'WITNESS';
    }> = [];

    // ۱. مجریان / پیمانکاران
    if (contract.contractors && contract.contractors.length > 0) {
      contract.contractors.forEach((c, idx) => {
        list.push({
          id: c.id || `c-${idx}`,
          roleTitle: c.role ? `پیمانکار / مجری (${c.role})` : `طرف اول / پیمانکار ${contract.contractors!.length > 1 ? `(${idx + 1})` : ''}`,
          name: c.name,
          nationalId: c.nationalId,
          phone: c.phone,
          type: 'CONTRACTOR',
        });
      });
    } else {
      list.push({
        id: 'main-contractor',
        roleTitle: 'طرف اول / مجری و پیمانکار',
        name: contract.contractorCompany || settings.companyName || 'شرکت مهندسی پیمان',
        nationalId: settings.nationalId,
        phone: settings.phones?.filter(Boolean)[0],
        type: 'CONTRACTOR',
      });
    }

    // ۲. کارفرمایان
    if (contract.employers && contract.employers.length > 0) {
      contract.employers.forEach((e, idx) => {
        list.push({
          id: e.id || `e-${idx}`,
          roleTitle: `طرف دوم / کارفرما ${contract.employers!.length > 1 ? `(${idx + 1})` : ''}`,
          name: e.name,
          nationalId: e.nationalId,
          phone: e.phone,
          type: 'EMPLOYER',
        });
      });
    } else {
      list.push({
        id: 'main-employer',
        roleTitle: 'طرف دوم / طرف حساب و کارفرما',
        name: contract.partyName || 'کارفرما',
        nationalId: undefined,
        phone: contract.partyPhone,
        type: 'EMPLOYER',
      });
    }

    // ۳. شاهدین (فقط در صورتی که ثبت شده باشند - طبق دستور اگر شاهدی ثبت نشده، خالی چاپ نشود!)
    if (contract.witnesses && contract.witnesses.length > 0) {
      contract.witnesses.forEach((w, idx) => {
        list.push({
          id: w.id || `w-${idx}`,
          roleTitle: `شاهد ${idx === 0 ? 'اول' : idx === 1 ? 'دوم' : idx + 1}`,
          name: w.name,
          nationalId: w.nationalId,
          phone: w.phone,
          type: 'WITNESS',
        });
      });
    }

    return list;
  }, [contract, settings]);

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* استایل‌های اختصاصی پرینت رسمی A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-a4-contract, #official-a4-contract * {
            visibility: visible !important;
          }
          #official-a4-contract {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: ${printMode === 'WITH_HEADER' ? '15mm 20mm !important' : '10mm 15mm !important'};
            background: white !important;
            color: #111 !important;
            box-shadow: none !important;
            border: ${printMode === 'WITH_HEADER' ? '2px solid #222 !important' : 'none !important'};
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ======================================================== */}
      {/* نوار ابزار کنترل بالای صفحه (تغییر مود، سوئیچ‌ها و دکمه چاپ) */}
      {/* ======================================================== */}
      <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* دکمه ویرایش / مشاهده پیش‌نمایش */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              isEditMode 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isEditMode ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditMode ? 'مشاهده پیش‌نمایش چاپی A4' : 'ویرایش متن و بندهای قرارداد'}</span>
          </button>

          {/* سوئیچ حالت قالب (ماده‌به‌ماده در برابر قالب سفارشی تگ‌دار) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setTemplateMode('ARTICLES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                templateMode === 'ARTICLES'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              تولید خودکار ماده‌به‌ماده
            </button>
            <button
              type="button"
              onClick={() => setTemplateMode('CUSTOM_TEMPLATE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                templateMode === 'CUSTOM_TEMPLATE'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>قالب سفارشی (تگ‌دار)</span>
            </button>
          </div>

          {/* سوئیچ چاپ دوحالته (با سربرگ / متن خالص بدون سربرگ) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setPrintMode('WITH_HEADER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printMode === 'WITH_HEADER'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="شامل کادر رسمی، لوگوی شرکت، شماره و تاریخ در سربرگ"
            >
              چاپ رسمی با سربرگ
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('PLAIN_TEXT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printMode === 'PLAIN_TEXT'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="حذف لوگو و کادرها؛ مخصوص چاپ بر روی کاغذهای سربرگ‌دار آماده"
            >
              متن خالص (بدون سربرگ)
            </button>
          </div>

          {/* سوئیچ نمایش مهر و امضای دیجیتال */}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer pr-2 border-r border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={showSignature}
              onChange={(e) => setShowSignature(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 cursor-pointer"
            />
            <Stamp className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">درج مهر دیجیتال</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره در پرونده</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ قرارداد (A4)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* بخش ادیتور (در صورت فعال بودن Edit Mode) */}
      {/* ======================================================== */}
      {isEditMode && (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-6 no-print">
          {templateMode === 'CUSTOM_TEMPLATE' ? (
            /* ۱. ادیتور قالب‌ساز هوشمند با نوار تگ‌ها */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white">
                      موتور قالب‌ساز هوشمند با تگ‌های داینامیک
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      با کلیک روی هر تگ، متغیر مربوطه در متن درج می‌شود و موقع پرینت با اطلاعات واقعی قرارداد و گرامر مفرد/جمع جایگزین خواهد شد.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefaultTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="بارگذاری مجدد متن قالب پیش‌فرض سراسری"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>قالب پیش‌فرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAsGlobalDefaultTemplate}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                    title="ذخیره این متن به عنوان الگوی پیش‌فرض همه قراردادها"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره به عنوان پیش‌فرض سیستم</span>
                  </button>
                </div>
              </div>

              {/* نوار دکمه‌های تگ‌های کلیک‌پذیر */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>تگ‌های هوشمند قرارداد (کلیک کنید تا به متن اضافه شود):</span>
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                  {AVAILABLE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer group"
                      title={t.desc}
                    >
                      <span className="font-mono text-amber-600 dark:text-amber-400 text-[11px] group-hover:scale-105 transition-transform">{t.tag}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">({t.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ادیتور متن قالب */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  متن قالب قرارداد با تگ‌ها:
                </label>
                <textarea
                  ref={textareaRef}
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  rows={14}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="متن قرارداد خود را به همراه تگ‌ها بنویسید..."
                />
              </div>

              {/* پیش‌نمایش زنده از تفسیر تگ‌ها */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  <span>پیش‌نمایش زنده خروجی نهایی (با اعمال اطلاعات قرارداد فعلی و گرامر مفرد/جمع):</span>
                </span>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 max-h-56 overflow-y-auto whitespace-pre-line font-serif">
                  {renderedCustomText || 'متنی وارد نشده است...'}
                </div>
              </div>
            </div>
          ) : (
            /* ۲. ویرایشگر کلاسیک ماده‌به‌ماده */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-500" /> ویرایشگر ماده به ماده قرارداد رسمی:
                </span>
                <span className="text-[11px] text-slate-400 font-bold">
                  متن هر ماده را می‌توانید مطابق با توافقات تغییر دهید
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                    ماده ۱ - طرفین قرارداد:
                  </label>
                  <textarea
                    value={art1}
                    onChange={(e) => setArt1(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                    ماده ۲ - موضوع و محل اجرای قرارداد:
                  </label>
                  <textarea
                    value={art2}
                    onChange={(e) => setArt2(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                    ماده ۳ - مدت زمان اجرا و تمدیدها:
                  </label>
                  <textarea
                    value={art3}
                    onChange={(e) => setArt3(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                    ماده ۴ - مبلغ کل قرارداد و شرایط پرداخت:
                  </label>
                  <textarea
                    value={art4}
                    onChange={(e) => setArt4(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                    ماده ۵ - کسورات قانونی، سپرده حسن انجام کار و تضامین:
                  </label>
                  <textarea
                    value={art5}
                    onChange={(e) => setArt5(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                      ماده ۶ - ایمنی کارگاه (HSE) و تعهدات مجری:
                    </label>
                    <textarea
                      value={art6}
                      onChange={(e) => setArt6(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
                      ماده ۷ - جریمه تأخیر، حل اختلاف و فسخ:
                    </label>
                    <textarea
                      value={art7}
                      onChange={(e) => setArt7(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium leading-relaxed resize-y"
                    />
                  </div>
                </div>

                {/* بخش افزودن تبصره‌های سفارشی */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    تبصره‌ها و شروط اختصاصی پیوست:
                  </span>
                  <div className="space-y-2">
                    {customClauses.map((clause, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
                        <span className="flex-1">{clause}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClause(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newClauseText}
                      onChange={(e) => setNewClauseText(e.target.value)}
                      placeholder="متن تبصره یا شرط جدید را وارد کنید..."
                      className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddClause}
                      className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shrink-0 cursor-pointer"
                    >
                      افزودن تبصره
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* برگه رسمی پیش‌نمایش چاپی قطع A4 (دوحالته با سربرگ یا متن خالص) */}
      {/* ======================================================== */}
      <div className="flex justify-center">
        <div
          id="official-a4-contract"
          className={`w-full max-w-4xl bg-white text-slate-950 p-8 sm:p-14 min-h-[1120px] flex flex-col justify-between transition-all ${
            printMode === 'WITH_HEADER'
              ? 'rounded-[2.5rem] shadow-2xl border-2 border-slate-300 space-y-8'
              : 'rounded-2xl border border-dashed border-slate-300 shadow-sm space-y-6'
          }`}
        >
          <div>
            {/* ۱. سربرگ رسمی: فقط در صورت انتخاب حالت WITH_HEADER نمایش می‌یابد */}
            {printMode === 'WITH_HEADER' ? (
              <div className="border-b-2 border-slate-900 pb-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="لوگو" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-md">
                      {settings.companyName ? settings.companyName.substring(0, 1) : 'پ'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                      {contract.contractorCompany || settings.companyName || 'شرکت مهندسی و ساختمانی پیمان'}
                    </h1>
                    <span className="text-xs text-slate-600 block mt-1">
                      سامانه یکپارچه مدیریت قراردادها و پیمان‌ها (پیمان ERP)
                    </span>
                    {settings.registrationNumber && (
                      <span className="text-[10px] text-slate-500 font-mono block">
                        شماره ثبت: {settings.registrationNumber} • شناسه ملی: {settings.nationalId || '---'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left font-mono text-xs space-y-1">
                  <div>شماره قرارداد: <strong>{contract.contractNumber}</strong></div>
                  <div>تاریخ انعقاد: <strong>{contract.startDate || '---'}</strong></div>
                  <div>
                    تاریخ اتمام: <strong>
                      {hasFixedEnd ? (contract.currentEndDate || contract.initialEndDate) : 'پایان عملیات'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              /* در حالت متن خالص بدون سربرگ: فقط شماره و تاریخ بسیار ساده و کوچک در بالای صفحه */
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-b border-slate-200 pb-2">
                <span>شماره قرارداد: {contract.contractNumber}</span>
                <span>تاریخ: {contract.startDate || '---'}</span>
              </div>
            )}

            {/* کادر عنوان قرارداد (در حالت با سربرگ کادر مجزا، در حالت بدون سربرگ تایتل بولد مرکزی) */}
            {printMode === 'WITH_HEADER' ? (
              <div className="text-center my-6 py-2.5 bg-slate-100 rounded-xl border border-slate-300">
                <h2 className="text-lg font-black text-slate-950">
                  {contract.title}
                </h2>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  پروژه: {contract.projectName || 'عمومی'} {scopeText} • طرف حساب: {employerNames}
                </div>
              </div>
            ) : (
              <div className="text-center my-5">
                <h2 className="text-base sm:text-lg font-black text-slate-950 underline underline-offset-8">
                  {contract.title}
                </h2>
              </div>
            )}

            {/* متن اصلی قرارداد بر اساس templateMode */}
            {templateMode === 'CUSTOM_TEMPLATE' ? (
              /* رندر قالب سفارشی تگ‌دار */
              <div className="space-y-4 font-serif text-[13px] leading-relaxed text-justify px-2 text-slate-900 whitespace-pre-line">
                {renderedCustomText}
              </div>
            ) : (
              /* رندر ماده‌به‌ماده خودکار */
              <div className="space-y-4 font-serif text-[13px] leading-relaxed text-justify px-2 text-slate-900">
                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۱ - طرفین قرارداد:</strong>
                  <p>{art1}</p>
                </div>

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۲ - موضوع و محل اجرای قرارداد:</strong>
                  <p>{art2}</p>
                </div>

                {/* جدول ریز متره در صورت وجود */}
                {contract.measurementItems && contract.measurementItems.length > 0 && (
                  <div className="my-3 overflow-hidden rounded-xl border border-slate-300 font-sans text-xs">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                          <th className="p-2">ردیف</th>
                          <th className="p-2">شرح عملیات</th>
                          <th className="p-2 text-center">مقدار</th>
                          <th className="p-2 text-center">واحد</th>
                          <th className="p-2 text-left">فی واحد (تومان)</th>
                          <th className="p-2 text-left">مبلغ کل (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {contract.measurementItems.slice(0, 5).map((m, idx) => (
                          <tr key={m.id}>
                            <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="p-1.5">{m.description}</td>
                            <td className="p-1.5 text-center font-mono">{m.quantity.toLocaleString('fa-IR')}</td>
                            <td className="p-1.5 text-center">{m.unit}</td>
                            <td className="p-1.5 text-left font-mono">{m.unitPrice.toLocaleString('fa-IR')}</td>
                            <td className="p-1.5 text-left font-mono font-bold">{formatCurrency((m.quantity * m.unitPrice))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۳ - مدت زمان اجرا:</strong>
                  <p>{art3}</p>
                </div>

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۴ - مبلغ کل قرارداد و نحوه پرداخت:</strong>
                  <p>{art4}</p>
                </div>

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۵ - کسورات قانونی و تضامین:</strong>
                  <p>{art5}</p>
                </div>

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۶ - تعهدات طرفین و ایمنی کارگاه:</strong>
                  <p>{art6}</p>
                </div>

                <div>
                  <strong className="font-bold text-slate-950 font-sans block mb-1">ماده ۷ - شرایط فسخ، جریمه و حل اختلاف:</strong>
                  <p>{art7}</p>
                </div>

                {/* تبصره‌های اختصاصی پیوست */}
                {customClauses.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <strong className="font-bold text-slate-950 font-sans block mb-1">تبصره‌ها و شروط اختصاصی:</strong>
                    {customClauses.map((clause, idx) => (
                      <p key={idx} className="pr-2">{clause}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* باکس امضای داینامیک انتهای برگه (دقیقاً به تعداد طرفین ثبت‌شده) */}
          {/* ======================================================== */}
          <div className="border-t-2 border-slate-900 pt-6 mt-8">
            <div className={`grid gap-4 text-center text-xs font-black ${
              signatureParties.length === 2 ? 'grid-cols-2' :
              signatureParties.length === 3 ? 'grid-cols-3' :
              'grid-cols-2 sm:grid-cols-4'
            }`}>
              {signatureParties.map((party, idx) => (
                <div key={party.id} className="space-y-10 p-3 rounded-2xl bg-slate-50/60 border border-slate-200/60 print:bg-transparent print:border-none">
                  <div>
                    <span className="text-slate-500 font-bold block mb-1 text-[11px]">{party.roleTitle}:</span>
                    <strong className="text-slate-950 text-xs block">{party.name}</strong>
                    {party.nationalId && (
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">کد ملی: {party.nationalId}</span>
                    )}
                    {party.phone && (
                      <span className="block text-[10px] text-slate-400 font-mono" dir="ltr">{party.phone}</span>
                    )}
                  </div>
                  <div className="relative min-h-[44px] flex items-center justify-center">
                    {party.type === 'CONTRACTOR' && idx === 0 && showSignature && settings.signatureUrl && (
                      <img src={settings.signatureUrl} alt="امضا" className="max-h-16 object-contain" />
                    )}
                    <span className="text-slate-400 font-medium text-[10px]">
                      {party.type === 'CONTRACTOR' ? 'مهر و امضای مجاز' : 'امضا و اثر انگشت'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>صادر شده توسط سامانه جامع پیمان ERP</span>
              <span>نسخه رسمی و الزام‌آور فی‌مابین طرفین</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
