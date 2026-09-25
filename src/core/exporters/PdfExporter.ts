import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfTableConfig {
  title: string;
  headers: string[];
  data: any[][];
  sumIndexes?: number[];
}

export interface ExportExtraInfo {
  title: string;
  clientName: string;
  date: string;
  highlightCheques: boolean;
  financialSummary?: {
    totalExpenses: number;
    totalReceipts: number;
    finalBillingAmount: number;
    billingDesc: string;
    balance: number;
    balanceStatus: string;
  };
}

const loadFont = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
};

export const exportToPdfAdvanced = async (
  fileName: string, 
  tables: PdfTableConfig[], 
  companySettings?: any, 
  extraInfo?: ExportExtraInfo
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  try {
    const fontBase64 = await loadFont('/fonts/Vazirmatn-Regular.ttf');
    // رجیستر کردن فونت برای هر دو حالت normal و bold
    doc.addFileToVFS('Vazirmatn.ttf', fontBase64);
    doc.addFont('Vazirmatn.ttf', 'Vazirmatn', 'normal');
    doc.addFont('Vazirmatn.ttf', 'Vazirmatn', 'bold');
    doc.setFont('Vazirmatn', 'normal');
  } catch (error) {
    console.error("خطا در بارگذاری فونت. آیا فونت در پوشه public/fonts قرار دارد؟", error);
  }

  // ================= 💡 واترمارک لاکچری سازمانی =================
  const drawWatermark = (text: string) => {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 })); // شفافیت بسیار کمرنگ (5%)
    doc.setTextColor(15, 23, 42);
    doc.setFont('Vazirmatn', 'bold');
    doc.setFontSize(80);
    // چاپ متن به صورت مورب در مرکز صفحه
    doc.text(text, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  };

  // ================= 💡 سربرگ سازمانی =================
  const drawHeader = (pageNumber: number) => {
    // رسم واترمارک قبل از هر چیز تا در پس‌زمینه بیفتد
    drawWatermark(companySettings?.companyName || 'Peyman ERP System');

    doc.setFillColor(248, 250, 252); 
    doc.rect(10, 10, pageWidth - 20, 25, 'F');
    doc.setDrawColor(203, 213, 225); 
    doc.rect(10, 10, pageWidth - 20, 25, 'S');

    doc.setFont('Vazirmatn', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); 
    doc.text(companySettings?.companyName || 'گزارش سیستم مدیریت پیمان', pageWidth - 15, 18, { align: 'right' });

    doc.setFont('Vazirmatn', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); 
    const headerText = `گزارش: ${extraInfo?.title || 'عمومی'}   |   کارفرما/مشتری: ${extraInfo?.clientName || 'عمومی'}   |   تاریخ: ${extraInfo?.date}`;
    doc.text(headerText, pageWidth - 15, 26, { align: 'right' });

    // 💡 ارتقای چاپ لوگو
    if (companySettings?.logoUrl?.startsWith('data:image')) {
      try {
        // ابعاد لوگو با حفظ تناسب
        doc.addImage(companySettings.logoUrl, 'PNG', 15, 12.5, 20, 20);
      } catch (e) {
        console.warn("خطا در پردازش تصویر لوگو");
      }
    } else {
      doc.setFontSize(8);
      doc.text(`صفحه ${pageNumber}`, 20, 22);
    }
  };

  let currentY = 40;
  let pageCount = 1;
  drawHeader(pageCount);

  // ================= 💡 رسم جداول =================
  tables.forEach((table) => {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      pageCount++;
      drawHeader(pageCount);
      currentY = 40;
    }

    doc.setFont('Vazirmatn', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(table.title, pageWidth - 15, currentY, { align: 'right' });
    currentY += 4;

    const totals: number[] = new Array(table.headers.length).fill(0);
    
    const originalData = table.data.map(row => {
      return row.map((cell, cIdx) => {
        if (table.sumIndexes?.includes(cIdx)) totals[cIdx] += Number(cell || 0);
        return typeof cell === 'number' ? cell.toLocaleString('fa-IR') : cell;
      });
    });

    let hasTotals = false;
    if (table.sumIndexes && table.sumIndexes.length > 0 && originalData.length > 0) {
      hasTotals = true;
      const totalRow = new Array(table.headers.length).fill('');
      totalRow[0] = 'جمع کل:'; 
      table.sumIndexes.forEach(cIdx => {
         totalRow[cIdx] = totals[cIdx].toLocaleString('fa-IR');
      });
      originalData.push(totalRow);
    }

    // معکوس کردن آرایه‌ها برای چیدمان راست‌چین (RTL)
    const rtlHeaders = [...table.headers].reverse();
    const rtlData = originalData.map(row => [...row].reverse());

    autoTable(doc, {
      head: [rtlHeaders],
      body: rtlData,
      startY: currentY,
      theme: 'grid',
      styles: { 
        font: 'Vazirmatn', 
        fontStyle: 'normal',
        halign: 'center', 
        valign: 'middle', 
        fontSize: 8.5, 
        cellPadding: 2, 
        textColor: [15, 23, 42],
        overflow: 'linebreak',
        minCellWidth: 15
      },
      headStyles: { 
        font: 'Vazirmatn',
        fontStyle: 'bold', 
        fillColor: [51, 65, 85], // Slate-700
        textColor: 255,
        fontSize: 9, 
        cellPadding: 3,
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      didParseCell: (data) => {
        const isLastRow = data.row.index === rtlData.length - 1;
        const rowData = data.row.raw as any[];
        
        // استایل ردیف جمع کل
        if (hasTotals && isLastRow) {
          data.cell.styles.fillColor = [226, 232, 240]; 
          data.cell.styles.textColor = [15, 23, 42];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 9.5;
        } 
        // رنگ‌بندی هشداری چک‌ها
        else if (extraInfo?.highlightCheques) {
          const rowText = rowData.join(' ');
          if (rowText.includes('برگشتی')) {
            data.cell.styles.fillColor = [255, 228, 230]; 
            data.cell.styles.textColor = [159, 18, 57]; 
          } else if (rowText.includes('در جریان')) {
            data.cell.styles.fillColor = [254, 243, 199]; 
            data.cell.styles.textColor = [146, 64, 14]; 
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  // ================= 💡 جدول خلاصه وضعیت نهایی =================
  if (extraInfo?.financialSummary) {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      pageCount++;
      drawHeader(pageCount);
      currentY = 40;
    }

    const summary = extraInfo.financialSummary;
    const absoluteBalance = Math.abs(summary.balance).toLocaleString('fa-IR');

    const summaryData = [
      [summary.billingDesc, 'مبنای محاسبه قرارداد:'],
      [summary.totalExpenses.toLocaleString('fa-IR'), 'مجموع هزینه‌های قطعی:'],
      [summary.finalBillingAmount.toLocaleString('fa-IR'), 'مبلغ نهایی صورت‌وضعیت:'],
      [summary.totalReceipts.toLocaleString('fa-IR'), 'مجموع دریافتی از کارفرما:'],
      [absoluteBalance, `مانده نهایی (${summary.balanceStatus}):`]
    ];

    autoTable(doc, {
      head: [[ { content: 'خلاصه وضعیت مالی و صورت‌حساب نهایی', colSpan: 2, styles: { halign: 'center', fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 10 } } ]],
      body: summaryData,
      startY: currentY,
      theme: 'grid',
      styles: { font: 'Vazirmatn', fontSize: 9.5, cellPadding: 3.5, valign: 'middle' },
      columnStyles: {
        1: { halign: 'right', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 90, fontStyle: 'bold' }, 
        0: { halign: 'center', textColor: [15, 23, 42] } 
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) { 
          if (data.row.index === 2) { 
            data.cell.styles.textColor = [79, 70, 229]; 
            data.cell.styles.fillColor = [238, 242, 255]; 
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.row.index === 4) { 
            data.cell.styles.fontStyle = 'bold';
            if (summary.balance > 0) data.cell.styles.textColor = [217, 119, 6]; 
            else if (summary.balance < 0) data.cell.styles.textColor = [225, 29, 72]; 
            else data.cell.styles.textColor = [22, 163, 74]; 
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // ================= 💡 چاپگر هوشمند مهر و امضای دیجیتال =================
  if (companySettings && currentY < pageHeight - 32) {
    doc.setDrawColor(203, 213, 225); 
    doc.setLineDashPattern([2, 2], 0); 
    
    // باکس امضای پیمانکار
    doc.rect(20, currentY, 65, 28);
    doc.setFont('Vazirmatn', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    let hasDigitalSignature = false;

    // 💡 اگر مهر دیجیتال وجود داشت
    if (companySettings?.stampUrl?.startsWith('data:image')) {
      try {
        doc.addImage(companySettings.stampUrl, 'PNG', 15, currentY - 5, 30, 30);
        hasDigitalSignature = true;
      } catch (e) { console.warn("خطا در چاپ مهر"); }
    }

    // 💡 اگر امضای دیجیتال مدیر وجود داشت
    if (companySettings?.signatureUrl?.startsWith('data:image')) {
      try {
        doc.addImage(companySettings.signatureUrl, 'PNG', 45, currentY + 2, 35, 18);
        hasDigitalSignature = true;
      } catch (e) { console.warn("خطا در چاپ امضا"); }
    }

    // اگر مهر و امضا داشتیم، نوشته‌ی راهنما رو میفرستیم پایین کادر، وگرنه میاد وسط کادر
    if (!hasDigitalSignature) {
      doc.text('مُهر و امضای پیمانکار', 52.5, currentY + 15, { align: 'center' });
    } else {
      doc.setFontSize(7);
      doc.text('امضا دیجیتال تأیید شده', 52.5, currentY + 31.5, { align: 'center' }); 
    }

    // باکس امضای کارفرما
    doc.rect(pageWidth - 85, currentY, 65, 28);
    doc.setFontSize(9);
    doc.text('مُهر و امضای کارفرما / مشتری', pageWidth - 52.5, currentY + 15, { align: 'center' });
    
    doc.setLineDashPattern([], 0); 
  }

  doc.save(`${fileName}.pdf`);
};