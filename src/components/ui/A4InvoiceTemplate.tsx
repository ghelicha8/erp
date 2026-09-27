import { useMemo } from 'react';
import { QrCode, Camera, Send, Globe, Phone, MapPin, Percent } from 'lucide-react';
import type { Invoice, InvoiceItem } from '../../store/invoiceStore';

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
  };
}

const formatNum = (num?: number) => (num || 0).toLocaleString('fa-IR');

export default function A4InvoiceTemplate({ invoice, userSettings }: A4InvoiceTemplateProps) {
  
  // تنظیمات پیش‌فرض برای نمایش در صورت خالی بودن
  const settings = userSettings || {
    companyName: 'شرکت مهندسی و پیمانکاری',
    phones: ['۰۲۱-۱۲۳۴۵۶۷۸', '۰۹۱۲۳۴۵۶۷۸۹'],
    address: 'تهران، خیابان ولیعصر، برج مدیریت، طبقه ۱۰',
    instagram: '@peyman_co',
    telegram: '@peyman_support',
  };

  const isProforma = invoice.status === 'PROFORMA';

  // 💡 الگوریتم صفحه‌بندی ثابت و منظم (دقیقاً حداکثر ۱۰ ردیف در هر صفحه)
  const pages = useMemo(() => {
    const items = invoice.items || [];
    const result: { items: InvoiceItem[], startIndex: number, isLastPage: boolean }[] = [];
    const ITEMS_PER_PAGE = 10; // ثابت روی 10 ردیف برای جلوگیری از یتیم شدن فوتر

    // اگر هیچ آیتمی نبود، یک صفحه خالی بساز
    if (items.length === 0) {
      return [{ items: [], startIndex: 0, isLastPage: true }];
    }

    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      const pageItems = items.slice(i, i + ITEMS_PER_PAGE);
      const isLastPage = i + ITEMS_PER_PAGE >= items.length;
      result.push({ items: pageItems, startIndex: i, isLastPage });
    }

    return result;
  }, [invoice.items]);

  // واترمارک گرافیکی
  const getWatermark = () => {
    if (isProforma) return { text: 'پیش‌فاکتور (استعلام)', color: 'text-slate-100 border-slate-100' };
    if (invoice.status === 'PAID') return { text: 'تسویه شد', color: 'text-emerald-500/10 border-emerald-500/10' };
    if (invoice.status === 'OVERDUE') return { text: 'سررسید گذشته', color: 'text-rose-500/10 border-rose-500/10' };
    if ((invoice.payment?.debtAmount || 0) > 0) return { text: 'بدهی / نسیه', color: 'text-rose-500/10 border-rose-500/10' };
    return null;
  };
  const watermark = getWatermark();

  // آیا ستون تخفیف نیاز است؟ (اگر حداقل یک ردیف تخفیف داشت)
  const hasAnyRowDiscount = (invoice.items || []).some(i => (i.discount || 0) > 0);

  return (
    <div className="flex flex-col gap-8 print:gap-0">
      {pages.map((page, pageIndex) => (
        <div 
          key={pageIndex}
          className="bg-white text-slate-800 relative mx-auto overflow-hidden shadow-2xl print:shadow-none print:break-after-page flex flex-col"
          style={{ 
            width: '210mm', 
            minHeight: '297mm', // تضمین ارتفاع A4
            padding: '15mm',
            direction: 'rtl',
            fontFamily: 'Vazirmatn, system-ui, sans-serif'
          }}
        >
          {/* واترمارک گرافیکی */}
          {watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
              <div className={`transform -rotate-45 text-[100px] font-black border-[8px] rounded-[3rem] px-12 py-6 opacity-40 ${watermark.color}`}>
                {watermark.text}
              </div>
            </div>
          )}

          {/* ================= HEADER (فقط صفحه اول هدر کامل دارد) ================= */}
          {pageIndex === 0 ? (
            <header className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6 relative z-10 shrink-0">
              <div className="flex items-start gap-4">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-xl" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 border-2 border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 text-xl">
                    لوگو
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {settings.address}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-600 mt-1 max-w-[300px]">
                    {settings.phones.slice(0, 8).map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> <span dir="ltr">{phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-left">
                <h2 className="text-3xl font-black text-indigo-900 mb-1">{isProforma ? 'پیش‌فاکتور استعلام' : 'صورت‌حساب رسمی'}</h2>
                <div className="bg-slate-50 px-4 py-2 rounded-xl flex flex-col gap-1 border border-slate-200 text-right w-48">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">شماره فاکتور:</span>
                    <span className="font-mono text-slate-800">{invoice.invoiceNumber || '---'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">تاریخ صدور:</span>
                    <span className="text-slate-800">{invoice.date || '---'}</span>
                  </div>
                </div>
              </div>
            </header>
          ) : (
            <header className="flex justify-between items-center border-b border-slate-300 pb-4 mb-6 relative z-10 shrink-0">
              <span className="text-sm font-bold text-slate-500">ادامه صورت‌حساب <span className="font-mono">{invoice.invoiceNumber}</span></span>
              <span className="text-xs font-bold text-slate-400">صفحه {pageIndex + 1} از {pages.length}</span>
            </header>
          )}

          {/* ================= CLIENT INFO (فقط صفحه اول) ================= */}
          {pageIndex === 0 && (
            <section className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6 relative z-10 flex justify-between items-center shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-indigo-400">مشخصات خریدار / کارفرما:</span>
                <h3 className="text-lg font-black text-indigo-900">{invoice.clientName || 'نامشخص'}</h3>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[10px] font-black text-indigo-400">شماره تماس:</span>
                <span className="text-sm font-bold text-indigo-800 font-mono" dir="ltr">{invoice.clientPhone || '---'}</span>
              </div>
            </section>
          )}

          {/* ================= ITEMS TABLE ================= */}
          <section className="mb-6 relative z-10 flex-1">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="p-3 rounded-tr-xl font-bold w-12 text-center border-b-2 border-slate-900">ردیف</th>
                  <th className="p-3 font-bold border-b-2 border-slate-900">شرح کالا / خدمات</th>
                  <th className="p-3 font-bold text-center w-20 border-b-2 border-slate-900">تعداد</th>
                  <th className="p-3 font-bold text-center w-20 border-b-2 border-slate-900">واحد</th>
                  <th className="p-3 font-bold text-center w-28 border-b-2 border-slate-900">فی (تومان)</th>
                  {hasAnyRowDiscount && <th className="p-3 font-bold text-center w-24 border-b-2 border-slate-900 text-amber-300">تخفیف</th>}
                  <th className="p-3 rounded-tl-xl font-bold text-center w-32 border-b-2 border-slate-900">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-200 text-sm font-medium hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-500 font-mono">{page.startIndex + index + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{item.title}</td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-center text-slate-500">{item.unit}</td>
                    <td className="p-3 text-center font-mono">{formatNum(item.unitPrice)}</td>
                    {hasAnyRowDiscount && (
                      <td className="p-3 text-center font-mono text-amber-600">
                        {item.discount && item.discount > 0 ? formatNum(item.discount) : '-'}
                      </td>
                    )}
                    <td className="p-3 text-center font-black font-mono">{formatNum(item.totalPrice)}</td>
                  </tr>
                ))}
                {page.items.length === 0 && (
                  <tr>
                    <td colSpan={hasAnyRowDiscount ? 7 : 6} className="p-8 text-center text-slate-400 font-bold text-xs border-b border-slate-200">
                      ردیفی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* اگر صفحه آخر نیست، پیام ادامه را نشان بده */}
          {!page.isLastPage && (
            <div className="text-center text-xs font-bold text-slate-400 mt-auto pb-4 shrink-0">
              ادامه در صفحه بعد...
            </div>
          )}

          {/* ================= TOTALS, PAYMENT & TERMS (فقط صفحه آخر) ================= */}
          {page.isLastPage && (
            <div className="mb-24 flex flex-col gap-6 relative z-10 shrink-0">
              <section className="flex items-stretch gap-6">
                {/* اطلاعات پرداخت (سمت راست) */}
                {!isProforma && invoice.payment ? (
                  <div className="flex-1 border-2 border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-center">
                    <h4 className="text-[11px] font-black text-slate-500 mb-3 border-b border-slate-200 pb-2">جزئیات پرداخت و تسویه:</h4>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-emerald-600">واریز نقدی / حواله:</span>
                        <span className="font-black font-mono text-emerald-700" dir="ltr">{formatNum(invoice.payment.cashAmount)} <span className="text-[9px] font-normal">تومان</span></span>
                      </div>
                      
                      {(invoice.payment.cheques || []).map((cheque, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl">
                          <div className="flex justify-between items-center text-sm mb-1.5">
                            <span className="font-bold text-indigo-600">چک ({cheque.bank}):</span>
                            <span className="font-black font-mono text-indigo-700" dir="ltr">{formatNum(cheque.amount)} <span className="text-[9px] font-normal">تومان</span></span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[8.5px] font-bold text-slate-500">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">سررسید: {cheque.dueDate}</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">سریال: {cheque.serialNumber}</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">صیاد: {cheque.sayyadId}</span>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                        <span className="font-black text-rose-600">مانده بدهی (نسیه):</span>
                        <span className="font-black font-mono text-rose-700" dir="ltr">{formatNum(invoice.payment.debtAmount)} <span className="text-[9px] font-normal">تومان</span></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200">
                    <span className="text-xs font-bold">بخش تسویه در حالت پیش‌فاکتور غیرفعال است</span>
                  </div>
                )}

                {/* جمع مبالغ (سمت چپ) */}
                <div className="w-80 bg-slate-800 text-white rounded-2xl p-5 shadow-lg shrink-0">
                  <div className="flex justify-between items-center text-[13px] mb-2">
                    <span className="text-slate-300 font-bold">جمع مبالغ:</span>
                    <span className="font-mono">{formatNum(invoice.subTotal)}</span>
                  </div>
                  
                  {(invoice.payment?.totalDiscount || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs mb-2 text-amber-300">
                      <span className="font-bold flex items-center gap-1"><Percent className="w-3 h-3"/> سود شما (تخفیف):</span>
                      <span className="font-mono">-{formatNum(invoice.payment!.totalDiscount)}</span>
                    </div>
                  )}

                  {(invoice.payment?.taxAmount || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs mb-2 text-slate-400">
                      <span className="font-bold">مالیات بر ارزش افزوده:</span>
                      <span className="font-mono">+{formatNum(invoice.payment!.taxAmount)}</span>
                    </div>
                  )}
                  
                  {(invoice.payment?.retentionAmount || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs mb-2 text-rose-300">
                      <span className="font-bold">کسر سپرده انجام کار:</span>
                      <span className="font-mono">-{formatNum(invoice.payment!.retentionAmount)}</span>
                    </div>
                  )}
                  
                  {(invoice.payment?.insuranceAmount || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs mb-2 text-rose-300">
                      <span className="font-bold">کسورات بیمه:</span>
                      <span className="font-mono">-{formatNum(invoice.payment!.insuranceAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-600 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-black text-[13px]">مبلغ نهایی فاکتور:</span>
                    <span className="font-black text-lg font-mono text-emerald-400" dir="ltr">
                      {formatNum(invoice.grandTotal)}
                    </span>
                  </div>
                </div>
              </section>

              {/* 💡 بخش شرایط و توضیحات اختصاصی که اضافه شد */}
              {invoice.terms && (
                <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-800 mb-2">شرایط و توضیحات اختصاصی:</h4>
                  <p className="text-[11px] text-slate-700 font-bold leading-loose whitespace-pre-wrap">{invoice.terms}</p>
                </section>
              )}
            </div>
          )}

          {/* ================= FOOTER (فقط صفحه آخر) ================= */}
          {page.isLastPage && (
            <footer className="absolute bottom-[15mm] left-[15mm] right-[15mm] flex justify-between items-end border-t-2 border-slate-100 pt-4 shrink-0">
              {/* تبلیغات نرم‌افزار پیمان (غیرقابل ویرایش) */}
              <div className="flex items-center gap-3 w-48 opacity-80 select-none pointer-events-none">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center p-1">
                  <QrCode className="w-full h-full text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500">تهیه شده با نرم‌افزار جامع</span>
                  <span className="text-sm font-black text-indigo-600">پـیـــــمـان</span>
                  <span className="text-[7px] font-bold text-slate-400 mt-0.5">PeymanApp.ir</span>
                </div>
              </div>

              {/* 💡 محل امضا و مهر (همان کدهای خودتان حفظ شده است) */}
              <div className="flex gap-16 text-center shrink-0">
                {!isProforma && (
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-500 mb-10">{invoice.signatures?.client || 'مهر و امضای خریدار / کارفرما'}</span>
                    <div className="w-32 border-b border-slate-300"></div>
                  </div>
                )}
                {invoice.signatures?.approver && (
                  <div className="flex flex-col items-center relative">
                    <span className="text-[11px] font-bold text-slate-500 mb-10">{invoice.signatures.approver}</span>
                    <div className="w-32 border-b border-slate-300"></div>
                  </div>
                )}
                <div className="flex flex-col items-center relative">
                  <span className="text-[11px] font-bold text-slate-500 mb-10">{invoice.signatures?.preparer || 'مهر و امضای پیمانکار'}</span>
                  {settings.signatureUrl && !isProforma && (
                    <img src={settings.signatureUrl} alt="امضا" className="absolute top-4 w-24 h-auto opacity-80 mix-blend-multiply" />
                  )}
                  <div className="w-32 border-b border-slate-300"></div>
                </div>
              </div>

              {/* شبکه‌های اجتماعی کاربر */}
              <div className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-500 text-left w-48">
                {settings.instagram && <div className="flex items-center justify-end gap-1.5"><span dir="ltr">{settings.instagram}</span> <Camera className="w-3.5 h-3.5" /></div>}
                {settings.telegram && <div className="flex items-center justify-end gap-1.5"><span dir="ltr">{settings.telegram}</span> <Send className="w-3 h-3" /></div>}
                {settings.website && <div className="flex items-center justify-end gap-1.5"><span dir="ltr">{settings.website}</span> <Globe className="w-3.5 h-3.5" /></div>}
              </div>
            </footer>
          )}

        </div>
      ))}
    </div>
  );
}