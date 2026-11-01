/**
 * تبدیل اعداد به حروف فارسی (مبلغ به حروف)
 * پشتیبانی کامل تا میلیاردها و تریلیون‌ها تومان/ریال
 */

const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const dahha = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const sadgan = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const steps = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function threeDigitsToPersian(num: number): string {
  if (num === 0) return '';
  const result: string[] = [];

  const s = Math.floor(num / 100);
  const d = Math.floor((num % 100) / 10);
  const y = num % 10;

  if (s > 0) result.push(sadgan[s]);

  if (d === 1) {
    result.push(dahha[y]);
  } else {
    if (d > 1) result.push(dahgan[d]);
    if (y > 0) result.push(yekan[y]);
  }

  return result.join(' و ');
}

export function numberToPersianWords(input: number | string | undefined | null): string {
  if (input === undefined || input === null || input === '') return 'صفر';
  const cleanStr = String(input)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');

  const num = Math.floor(Number(cleanStr));
  if (isNaN(num) || num === 0) return 'صفر';
  if (num < 0) return 'منفی ' + numberToPersianWords(Math.abs(num));

  let temp = num;
  const groups: number[] = [];

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const text = threeDigitsToPersian(val);
      const stepLabel = steps[i];
      parts.push(stepLabel ? `${text} ${stepLabel}` : text);
    }
  }

  return parts.join(' و ');
}
