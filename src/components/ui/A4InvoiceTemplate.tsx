import React, { useMemo } from 'react';
import { QrCode, Phone, MapPin, Percent, CheckCircle2 } from 'lucide-react';
import type { Invoice, InvoiceItem } from '../../store/invoiceStore';

export type InvoicePrintSize = 'A4' | 'A5' | 'POS_80MM';

interface A4InvoiceTemplateProps {
  invoice: Partial<Invoice>;
  userSettings?: {
    companyName: string;
    logoUrl?: string;
    phones: string[];
    address: string;
    instagram?: string;
    telegram?: string;
    website?: string;
    signatureUrl?: string;
    currency?: 'toman' | 'rial';
    nationalId?: string;
    registrationNumber?: string;
    shebaNumber?: string;
  };
  pageSize?: InvoicePrintSize;
}

const formatNum = (num?: number) => (num || 0).toLocaleString('fa-IR');

export default function A4InvoiceTemplate({ 
  invoice, 
  userSettings, 
  pageSize = 'A4' 
}: A4InvoiceTemplateProps) {
  
  // تنظیمات پیش‌فرض برای نمایش در صورت خالی بودن
  const settings = userSettings || {
    companyName: 'شرکت مهندسی و پیمانکاری',
    phones: ['۰۲۱-۱۲۳۴۵۶۷۸', '۰۹۱۲۳۴۵۶۷۸۹'],
    address: 'تهران، خیابان ولیعصر، برج مدیریت، طبقه ۱۰',
    instagram: '@peyman_co',
    telegram: '@peyman_support',
    currency: 'toman' as const,
    nationalId: '',
    registrationNumber: '',
    shebaNumber: '',
  };

  const isProforma = invoice.status === 'PROFORMA';
  const isRial = settings.currency === 'rial' || (settings as any).currency === 'RIAL';
  const currencyLabel = isRial ? 'ریال' : 'تومان';
  const multiplier = isRial ? 10 : 1;

  const formatAmount = (num?: number) => ((num || 0) * multiplier).toLocaleString('fa-IR');

  // =========================================================================
  // 🚨 قوانین حیاتی ریاکت: تمام هوک‌ها بدون هیچ‌گونه شرط در ابتدای کامپوننت 🚨
  // =========================================================================
  const isA5 = pageSize === 'A5';
  const isPOS = pageSize === 'POS_80MM';
  const ITEMS_PER_PAGE = isA5 ? 7 : 10;
  const pageWidth = isA5 ? '148mm' : isPOS ? '80mm' : '210mm';
  const pageMinHeight = isA5 ? '210mm' : isPOS ? 'auto' : '297mm';
  const pagePadding = isA5 ? '8mm' : isPOS ? '4mm' : '14mm';

  // استایل پرینت داینامیک بر اساس سایز انتخابی
  const printStyle = useMemo(() => {
    if (pageSize === 'POS_80MM') {
      return `@page { size: 80mm auto; margin: 0; } @media print { @page { size: 80mm auto; margin: 0; } body { background: white !important; margin: 0 !important; padding: 0 !important; } }`;
    }
    if (pageSize === 'A5') {
      return `@page { size: A5 portrait; margin: 0; } @media print { body { background: white !important; } }`;
    }
    return `@page { size: A4 portrait; margin: 0; } @media print { body { background: white !important; } }`;
  }, [pageSize]);

  // الگوریتم صفحه‌بندی ثابت و منظم برای A4 و A5 (همیشه محاسبه می‌شود تا هوک نشکند)
  const pages = useMemo(() => {
    const items = invoice.items || [];
    const result: { items: InvoiceItem[], startIndex: number, isLastPage: boolean }[] = [];

    if (items.length === 0) {
      return [{ items: [], startIndex: 0, isLastPage: true }];
    }

    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      const pageItems = items.slice(i, i + ITEMS_PER_PAGE);
      const isLastPage = i + ITEMS_PER_PAGE >= items.length;
      result.push({ items: pageItems, startIndex: i, isLastPage });
    }

    return result;
  }, [invoice.items, ITEMS_PER_PAGE]);

  // واترمارک گرافیکی
  const watermark = useMemo(() => {
    if (isProforma) return { text: 'پیش‌فاکتور (استعلام)', color: 'text-slate-100 border-slate-100' };
    if (invoice.status === 'PAID') return { text: 'تسویه شد', color: 'text-emerald-500/10 border-emerald-500/10' };
    if (invoice.status === 'OVERDUE') return { text: 'سررسید گذشته', color: 'text-rose-500/10 border-rose-500/10' };
    if ((invoice.payment?.debtAmount || 0) > 0) return { text: 'بدهی / نسیه', color: 'text-rose-500/10 border-rose-500/10' };
    return null;
  }, [isProforma, invoice.status, invoice.payment?.debtAmount]);

  const hasAnyRowDiscount = useMemo(() => {
    return (invoice.items || []).some(i => (i.discount || 0) > 0);
  }, [invoice.items]);

  // =========================================================================
  // ۱. رندر فیش حرارتی رول ۸۰ میلی‌متری (پس از اجرای ۱۰۰٪ هوک‌ها)
  // =========================================================================
  if (isPOS) {
    const items = invoice.items || [];
    return (
      <div className="bg-white text-black font-sans relative" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: printStyle }} />

        <div 
          className="mx-auto bg-white text-black p-3 text-[11px] font-medium leading-tight shadow-md print:shadow-none"
          style={{ width: '80mm', minHeight: 'auto', boxSizing: 'border-box' }}
        >
          {/* هدر فیش حرارتی */}
          <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-1">
            <h2 className="text-sm font-black tracking-tight">{settings.companyName}</h2>
            <div className="text-[10px] font-bold text-slate-700">
              {isProforma ? '*** پیش‌فاکتور استعلام قیمت ***' : '*** فاکتور رسمی فروش / تحویل کارگاهی ***'}
            </div>
            {settings.phones?.[0] && (
              <div className="text-[10px] font-mono dir-ltr">{settings.phones[0]}</div>
            )}
          </div>

          {/* اطلاعات شناسه فاکتور و خریدار */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
            <div className="flex justify-between items-center">
              <span>شماره سند:</span>
              <span className="font-mono font-black">{invoice.invoiceNumber || '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>تاریخ:</span>
              <span className="font-mono">{invoice.date || '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>خریدار:</span>
              <span className="font-bold">{invoice.clientName || 'مشتری آزاد / عمومی'}</span>
            </div>
            {invoice.clientPhone && (
              <div className="flex justify-between items-center">
                <span>تلفن همراه:</span>
                <span className="font-mono dir-ltr">{invoice.clientPhone}</span>
              </div>
            )}
          </div>

          {/* جدول اقلام حرارتی */}
          <div className="py-2 border-b-2 border-dashed border-black">
            <div className="flex justify-between font-black text-[9.5px] pb-1 border-b border-black mb-1.5">
              <span className="w-6 text-center">ردیف</span>
              <span className="flex-1 text-right pr-1">شرح کالا / خدمات</span>
              <span className="w-10 text-center">تعداد</span>
              <span className="w-16 text-left">مبلغ ({currencyLabel})</span>
            </div>

            <div className="space-y-1.5 text-[9.5px]">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start leading-tight">
                  <span className="w-6 text-center text-slate-600 font-mono">{idx + 1}</span>
                  <div className="flex-1 pr-1">
                    <span className="font-bold block">{item.description || (item as any).title || (item as any).name || ''}</span>
                    <span className="text-[8.5px] text-slate-600 font-mono">
                      {formatNum(item.quantity)} × {formatAmount(item.unitPrice)}
                    </span>
                  </div>
                  <span className="w-10 text-center font-mono">{formatNum(item.quantity)}</span>
                  <span className="w-16 text-left font-black font-mono">{formatAmount(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* جمع‌ها و محاسبات مالی */}
          <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[10.5px]">
            <div className="flex justify-between items-center">
              <span>جمع ناخالص:</span>
              <span className="font-mono font-bold">{formatAmount(invoice.totalAmount || (invoice as any).subtotal || (invoice as any).subTotal || 0)} {currencyLabel}</span>
            </div>

            {((invoice.discountAmount || (invoice.payment as any)?.totalDiscount || 0) > 0) && (
              <div className="flex justify-between items-center text-slate-800">
                <span>تخفیف:</span>
                <span className="font-mono">- {formatAmount(invoice.discountAmount || (invoice.payment as any)?.totalDiscount)} {currencyLabel}</span>
              </div>
            )}

            {((invoice.taxAmount || (invoice.payment as any)?.taxAmount || 0) > 0) && (
              <div className="flex justify-between items-center text-slate-800">
                <span>مالیات و عوارض:</span>
                <span className="font-mono">+ {formatAmount(invoice.taxAmount || (invoice.payment as any)?.taxAmount)} {currencyLabel}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-black text-xs pt-1 border-t border-black">
              <span>مبلغ قابل پرداخت:</span>
              <span className="font-mono text-sm">{formatAmount(invoice.finalAmount || (invoice as any).totalBilled || (invoice as any).grandTotal || 0)} {currencyLabel}</span>
            </div>

            {/* جزئیات پرداخت */}
            {invoice.payment && (
              <div className="pt-1 mt-1 border-t border-dashed border-slate-400 space-y-0.5 text-[9.5px]">
                <div className="flex justify-between items-center">
                  <span>نوع پرداخت:</span>
                  <span className="font-bold">
                    {(invoice.payment as any)?.method === 'CASH' ? 'نقد' :
                     (invoice.payment as any)?.method === 'CARD' ? 'کارتخوان' :
                     (invoice.payment as any)?.method === 'TRANSFER' ? 'انتقال بانکی' :
                     (invoice.payment as any)?.method === 'CHEQUE' ? 'چک مدت‌دار' :
                     (invoice.payment as any)?.method === 'CREDIT' ? 'نسیه / اعتباری' : 'ترکیبی'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>پرداخت شده:</span>
                  <span className="font-mono">{formatAmount((invoice.payment as any)?.paidAmount || ((invoice.payment as any)?.cashAmount || 0) + ((invoice.payment as any)?.chequeAmount || 0))} {currencyLabel}</span>
                </div>
                {((invoice.payment?.debtAmount || 0) > 0) && (
                  <div className="flex justify-between items-center font-bold">
                    <span>مانده حساب (بدهی):</span>
                    <span className="font-mono">{formatAmount(invoice.payment.debtAmount)} {currencyLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* توضیحات اختصاصی حرارتی */}
          {(invoice.terms || (invoice as any).notes) && (
            <div className="py-2 border-b border-dashed border-black text-[9.5px] leading-snug">
              <span className="font-black block mb-0.5">توضیحات:</span>
              <p className="whitespace-pre-wrap">{invoice.terms || (invoice as any).notes}</p>
            </div>
          )}

          {/* بارکد شبیه‌سازی‌شده و کیوآرکد فیش */}
          <div className="pt-3 text-center space-y-2">
            <div className="flex flex-col items-center justify-center">
              <div className="h-9 w-44 mx-auto flex items-end justify-center gap-[2px] overflow-hidden">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-black" 
                    style={{ 
                      width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '1px' : '2px', 
                      height: `${24 + (i % 7) * 2}px` 
                    }} 
                  />
                ))}
              </div>
              <span className="text-[8.5px] font-mono tracking-widest mt-0.5">*{invoice.invoiceNumber || 'PEYMAN-ERP'}*</span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <QrCode className="w-8 h-8 text-black" />
              <div className="text-right text-[8px] leading-tight">
                <span className="font-black block">نرم‌افزار یکپارچه پیمان ERP</span>
                <span className="text-slate-600 font-mono">PeymanApp.ir</span>
              </div>
            </div>

            <div className="text-[8.5px] text-slate-600 pt-1">
              از خرید و همکاری شما سپاسگزاریم
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ۲. قالب‌های برگه‌ای A4 رسمی و A5 نیم‌برگ کارگاهی
  // =========================================================================
  return (
    <div className="flex flex-col gap-8 print:gap-0">
      <style dangerouslySetInnerHTML={{ __html: printStyle }} />

      {pages.map((page, pageIndex) => (
        <div 
          key={pageIndex}
          className="bg-white text-slate-800 relative mx-auto overflow-hidden shadow-2xl print:shadow-none print:break-after-page flex flex-col justify-between"
          style={{ 
            width: pageWidth, 
            minHeight: pageMinHeight,
            padding: pagePadding,
            direction: 'rtl',
            fontFamily: 'Vazirmatn, system-ui, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* محتوای بدنه فاکتور */}
          <div className="flex-1 flex flex-col">
            
            {/* واترمارک گرافیکی */}
            {watermark && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                <div className={`transform -rotate-45 ${isA5 ? 'text-[65px] px-8 py-4 border-[6px]' : 'text-[100px] px-12 py-6 border-[8px]'} font-black rounded-[3rem] opacity-40 ${watermark.color}`}>
                  {watermark.text}
                </div>
              </div>
            )}

            {/* ================= HEADER ================= */}
            <header className={`flex justify-between items-center ${isA5 ? 'border-b border-slate-800 pb-2 mb-2' : 'border-b-2 border-slate-800 pb-5 mb-4'} shrink-0 relative z-10`}>
              {/* لوگو و نام شرکت */}
              <div className="flex items-center gap-3">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className={`${isA5 ? 'w-10 h-10' : 'w-16 h-16'} object-contain rounded-xl`} />
                ) : (
                  <div className={`${isA5 ? 'w-10 h-10 text-base' : 'w-16 h-16 text-xl'} bg-slate-900 text-white flex items-center justify-center rounded-xl font-black`}>
                    {settings.companyName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className={`${isA5 ? 'text-sm' : 'text-xl'} font-black text-slate-900`}>{settings.companyName}</h1>
                  <p className={`${isA5 ? 'text-[9px]' : 'text-xs'} text-slate-500 font-bold mt-0.5`}>
                    {isProforma ? 'پیش‌فاکتور رسمی (استعلام بها)' : isA5 ? 'فاکتور فروش و تحویل کارگاهی (A5)' : 'صورت‌حساب فروش کالا و خدمات'}
                  </p>
                </div>
              </div>

              {/* مشخصات فاکتور */}
              <div className={`text-left bg-slate-50 ${isA5 ? 'p-1.5 min-w-[120px]' : 'p-3 min-w-[150px]'} rounded-xl border border-slate-200`}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-bold">شماره:</span>
                  <span className="font-mono font-black text-slate-800">{invoice.invoiceNumber || '---'}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs mt-1">
                  <span className="text-slate-500 font-bold">تاریخ:</span>
                  <span className="font-mono font-bold text-slate-800">{invoice.date || '---'}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between gap-3 text-xs mt-1">
                    <span className="text-slate-500 font-bold">سررسید:</span>
                    <span className="font-mono font-bold text-rose-600">{invoice.dueDate}</span>
                  </div>
                )}
                {pages.length > 1 && (
                  <div className="flex justify-between gap-3 text-[10px] mt-1 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 font-bold">صفحه:</span>
                    <span className="font-mono font-bold text-slate-600">{pageIndex + 1} از {pages.length}</span>
                  </div>
                )}
              </div>
            </header>

            {/* ================= مشخصات خریدار و فروشنده ================= */}
            <section className={`grid grid-cols-2 gap-2.5 ${isA5 ? 'mb-2.5 text-[9.5px]' : 'mb-4 text-xs'} relative z-10 shrink-0`}>
              {/* فروشنده */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="font-black text-slate-800 block mb-0.5">فروشنده:</span>
                <div className="space-y-0.5 text-slate-600">
                  <div><span className="text-slate-400">نام:</span> {settings.companyName}</div>
                  {settings.nationalId && <div><span className="text-slate-400">شناسه ملی:</span> {settings.nationalId}</div>}
                  <div><span className="text-slate-400">تلفن:</span> {settings.phones?.join(' - ') || '---'}</div>
                  <div className="truncate"><span className="text-slate-400">نشانی:</span> {settings.address}</div>
                </div>
              </div>

              {/* خریدار */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="font-black text-slate-800 block mb-0.5">خریدار / کارفرما:</span>
                <div className="space-y-0.5 text-slate-600">
                  <div><span className="text-slate-400">نام شخص/شرکت:</span> {invoice.clientName || 'مشتری آزاد / عمومی'}</div>
                  {((invoice as any).clientNationalId || (invoice as any).nationalId) && <div><span className="text-slate-400">شناسه/کد ملی:</span> {((invoice as any).clientNationalId || (invoice as any).nationalId)}</div>}
                  <div><span className="text-slate-400">تلفن همراه:</span> {invoice.clientPhone || '---'}</div>
                  <div className="truncate"><span className="text-slate-400">نشانی پروژه:</span> {((invoice as any).clientAddress || (invoice as any).address || '---')}</div>
                </div>
              </div>
            </section>

            {/* ================= جدول اقلام ================= */}
            <div className="flex-1 relative z-10">
              <table className={`w-full text-right border-collapse border border-slate-300 ${isA5 ? 'text-[9.5px]' : 'text-xs'}`}>
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-1.5 border border-slate-700 text-center w-8">#</th>
                    <th className="p-1.5 border border-slate-700">شرح کالا یا خدمات</th>
                    <th className="p-1.5 border border-slate-700 text-center w-12">مقدار</th>
                    <th className="p-1.5 border border-slate-700 text-center w-12">واحد</th>
                    <th className="p-1.5 border border-slate-700 text-center w-24">مبلغ واحد ({currencyLabel})</th>
                    {hasAnyRowDiscount && (
                      <th className="p-1.5 border border-slate-700 text-center w-16">تخفیف</th>
                    )}
                    <th className="p-1.5 border border-slate-700 text-center w-28">مبلغ کل ({currencyLabel})</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-1.5 border border-slate-200 text-center font-mono">{page.startIndex + idx + 1}</td>
                      <td className="p-1.5 border border-slate-200 font-bold">{item.description || (item as any).title || (item as any).name || ''}</td>
                      <td className="p-1.5 border border-slate-200 text-center font-mono">{formatNum(item.quantity)}</td>
                      <td className="p-1.5 border border-slate-200 text-center text-slate-500">{item.unit || 'عدد'}</td>
                      <td className="p-1.5 border border-slate-200 text-center font-mono">{formatAmount(item.unitPrice)}</td>
                      {hasAnyRowDiscount && (
                        <td className="p-1.5 border border-slate-200 text-center font-mono text-slate-500">
                          {item.discount ? formatAmount(item.discount) : '-'}
                        </td>
                      )}
                      <td className="p-1.5 border border-slate-200 text-center font-mono font-black">{formatAmount(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ================= خلاصه وضعیت مالی و محاسبات (فقط صفحه آخر) ================= */}
            {page.isLastPage && (
              <div className={`mt-3 space-y-3 relative z-10 shrink-0 ${isA5 ? 'text-[9.5px]' : 'text-xs'}`}>
                <section className="grid grid-cols-2 gap-3 items-start">
                  
                  {/* اطلاعات پرداخت و تسویه */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <h4 className="font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      اطلاعات پرداخت و تسویه:
                    </h4>
                    {invoice.payment ? (
                      <div className="space-y-0.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>نحوه پرداخت:</span>
                          <span className="font-bold text-slate-800">
                            {(invoice.payment as any)?.method === 'CASH' ? 'نقدی' :
                             (invoice.payment as any)?.method === 'CARD' ? 'کارتخوان' :
                             (invoice.payment as any)?.method === 'TRANSFER' ? 'واریز به حساب / کارت به کارت' :
                             (invoice.payment as any)?.method === 'CHEQUE' ? 'چک صیادی مدت‌دار' :
                             (invoice.payment as any)?.method === 'CREDIT' ? 'نسیه / حساب دفتری' : 'ترکیبی'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>مبلغ پرداخت شده:</span>
                          <span className="font-mono font-bold text-emerald-600">{formatAmount((invoice.payment as any)?.paidAmount || ((invoice.payment as any)?.cashAmount || 0) + ((invoice.payment as any)?.chequeAmount || 0))} {currencyLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>مانده حساب (بدهی):</span>
                          <span className="font-mono font-bold text-rose-600">{formatAmount(invoice.payment.debtAmount)} {currencyLabel}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">اطلاعات پرداختی ثبت نشده است.</span>
                    )}
                  </div>

                  {/* جدول جمع کل فاکتور */}
                  <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1.5 shadow-md">
                    <div className="flex justify-between text-slate-300">
                      <span>جمع ناخالص فاکتور:</span>
                      <span className="font-mono font-bold">{formatAmount(invoice.totalAmount || (invoice as any).subtotal || (invoice as any).subTotal || 0)} {currencyLabel}</span>
                    </div>

                    {((invoice.discountAmount || (invoice.payment as any)?.totalDiscount || 0) > 0) && (
                      <div className="flex justify-between text-slate-300">
                        <span>مجموع تخفیف:</span>
                        <span className="font-mono font-bold text-amber-400">- {formatAmount(invoice.discountAmount || (invoice.payment as any)?.totalDiscount)} {currencyLabel}</span>
                      </div>
                    )}

                    {((invoice.taxAmount || (invoice.payment as any)?.taxAmount || 0) > 0) && (
                      <div className="flex justify-between text-slate-300">
                        <span>مالیات و ارزش افزوده:</span>
                        <span className="font-mono font-bold">+ {formatAmount(invoice.taxAmount || (invoice.payment as any)?.taxAmount)} {currencyLabel}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-black text-emerald-400">
                      <span>مبلغ نهایی فاکتور ({currencyLabel}):</span>
                      <span className={`${isA5 ? 'text-base' : 'text-lg'} font-mono`}>
                        {formatAmount(invoice.finalAmount || (invoice as any).totalBilled || (invoice as any).grandTotal || 0)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* شرایط و توضیحات اختصاصی */}
                {(invoice.terms || (invoice as any).notes) && (
                  <section className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-800 mb-0.5">شرایط و توضیحات اختصاصی:</h4>
                    <p className="text-[9.5px] text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{invoice.terms || (invoice as any).notes}</p>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* ================= FOOTER / مهر و امضا (فقط صفحه آخر) ================= */}
          {page.isLastPage && (
            <footer className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-end shrink-0 relative z-10">
              <div className="flex items-center gap-2 select-none pointer-events-none">
                <QrCode className="w-7 h-7 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-bold text-slate-400">نرم‌افزار جامع</span>
                  <span className="text-xs font-black text-indigo-600">پـیـــــمـان ERP</span>
                </div>
              </div>

              {/* امضاها */}
              <div className={`flex ${isA5 ? 'gap-6' : 'gap-12'} text-center shrink-0`}>
                {!isProforma && (
                  <div className="flex flex-col items-center">
                    <span className="text-[9.5px] font-bold text-slate-500 mb-5">{(invoice.signatures as any)?.client || 'امضای خریدار'}</span>
                    <div className={`${isA5 ? 'w-20' : 'w-28'} border-b border-slate-300`}></div>
                  </div>
                )}
                <div className="flex flex-col items-center relative">
                  <span className="text-[9.5px] font-bold text-slate-500 mb-5">{(invoice.signatures as any)?.preparer || 'مهر و امضای پیمانکار'}</span>
                  {settings.signatureUrl && !isProforma && (
                    <img src={settings.signatureUrl} alt="امضا" className="absolute top-1 w-16 h-auto opacity-80 mix-blend-multiply" />
                  )}
                  <div className={`${isA5 ? 'w-20' : 'w-28'} border-b border-slate-300`}></div>
                </div>
              </div>

              <div className="text-[8px] text-slate-400 text-left font-mono">
                {settings.phones?.[0]}
              </div>
            </footer>
          )}

        </div>
      ))}
    </div>
  );
}