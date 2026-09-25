import * as ExcelJS from 'exceljs';

export interface ExcelSheetConfig {
  sheetName: string;
  headers: Record<string, string>;
  data: any[];
  sumColumns?: string[];
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

// 💡 موتور هوشمند استخراج و پردازش تصاویر (برای تبدیل Base64 به آبجکتِ قابل فهمِ اکسل)
const parseBase64Image = (dataUri?: string) => {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image')) return null;
  const parts = dataUri.split(',');
  if (parts.length !== 2) return null;
  
  const mime = parts[0].match(/image\/([a-zA-Z]+)/);
  let ext = (mime && mime[1]) ? mime[1].toLowerCase() : 'png';
  if (ext === 'jpg') ext = 'jpeg';
  if (!['png', 'jpeg', 'gif'].includes(ext)) ext = 'png'; // اکسل فقط این 3 فرمت رو پشتیبانی می‌کنه
  
  return { base64: parts[1], ext: ext as 'png' | 'jpeg' | 'gif' };
};

export const exportToExcelAdvanced = async (
  fileName: string, 
  sheets: ExcelSheetConfig[], 
  companySettings?: any, 
  extraInfo?: ExportExtraInfo
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companySettings?.companyName || 'سیستم مدیریت پیمان';
  workbook.created = new Date();

  // ================= 💡 بارگذاری تصاویر در حافظه‌ی ورک‌بوک اکسل =================
  let logoId: number | undefined;
  let stampId: number | undefined;
  let sigId: number | undefined;

  const logoData = parseBase64Image(companySettings?.logoUrl);
  if (logoData) logoId = workbook.addImage({ base64: logoData.base64, extension: logoData.ext });

  const stampData = parseBase64Image(companySettings?.stampUrl);
  if (stampData) stampId = workbook.addImage({ base64: stampData.base64, extension: stampData.ext });

  const sigData = parseBase64Image(companySettings?.signatureUrl);
  if (sigData) sigId = workbook.addImage({ base64: sigData.base64, extension: sigData.ext });

  sheets.forEach(({ sheetName, headers, data, sumColumns }) => {
    // مخفی کردن خطوط دیفالت اکسل برای ایجاد یک بوم سفید و شیک
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, showGridLines: false }] 
    });

    const headerKeys = Object.keys(headers);
    const colCount = headerKeys.length;

    // 💡 الگوریتم هوشمند تنظیم اتوماتیک عرض ستون‌ها (Auto-Fit)
    ws.columns = headerKeys.map(key => {
      let maxLen = headers[key].length;
      
      data.forEach(row => {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const strVal = String(val);
          const lines = strVal.split('\n');
          lines.forEach(line => {
            if (line.length > maxLen) maxLen = line.length;
          });
        }
      });
      
      const finalWidth = Math.min(Math.max(maxLen + 4, 15), 45);
      return { header: '', key: key, width: finalWidth };
    });

    // ================= 💡 سربرگ شیک سازمانی =================
    ws.mergeCells(1, 1, 1, colCount);
    const titleRow = ws.getRow(1);
    titleRow.height = 45; // ارتفاع بیشتر برای جا دادن لوگو
    const titleCell = titleRow.getCell(1);
    titleCell.value = companySettings?.companyName || 'گزارش جامع سیستم مدیریت پیمان';
    titleCell.font = { name: 'Tahoma', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; 
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 💡 تزریق لوگوی شرکت در هدر اکسل
    if (logoId !== undefined) {
      ws.addImage(logoId, {
        tl: { col: colCount > 2 ? colCount - 1 : 1, row: 0.1 }, // در نمای RTL این عدد میفته سمت چپ هدر
        ext: { width: 55, height: 55 } // ابعاد استاندارد لوگو
      });
    }

    ws.mergeCells(2, 1, 2, colCount);
    const subTitleRow = ws.getRow(2);
    subTitleRow.height = 25;
    const subTitleCell = subTitleRow.getCell(1);
    subTitleCell.value = `گزارش: ${extraInfo?.title || sheetName}   |   کارفرما/مشتری: ${extraInfo?.clientName || 'عمومی'}   |   تاریخ: ${extraInfo?.date}`;
    subTitleCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    subTitleCell.border = { bottom: { style: 'medium', color: { argb: 'FF94A3B8' } } };

    ws.getRow(3).height = 10;

    // ================= 💡 هدر جدول =================
    const tableHeaderRow = ws.getRow(4);
    tableHeaderRow.height = 32;
    headerKeys.forEach((key, index) => {
      const cell = tableHeaderRow.getCell(index + 1);
      cell.value = headers[key];
      cell.font = { name: 'Tahoma', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; 
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E293B' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        left: { style: 'thin', color: { argb: 'FF64748B' } },
        right: { style: 'thin', color: { argb: 'FF64748B' } }
      };
    });

    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colCount } };

    // ================= 💡 بدنه جدول =================
    const totals: Record<string, number> = {};
    sumColumns?.forEach(col => totals[col] = 0);

    let currentRow = 5;
    data.forEach((rowData, index) => {
      const row = ws.getRow(currentRow);
      
      const isEven = index % 2 === 0;
      let bgColor = isEven ? 'FFFFFFFF' : 'FFE2E8F0'; 
      let textColor = 'FF0F172A';

      if (extraInfo?.highlightCheques && rowData['_status']) {
        if (rowData['_status'] === 'در جریان') {
          bgColor = 'FFFFFBEB'; 
          textColor = 'FF92400E';
        } else if (rowData['_status'] === 'برگشتی') {
          bgColor = 'FFFFF1F2'; 
          textColor = 'FFBE123C';
        }
      }
      
      headerKeys.forEach((key, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        
        const cellValue = rowData[key];
        cell.value = (cellValue === undefined || cellValue === null) ? '' : cellValue;
        
        cell.font = { name: 'Tahoma', size: 10, color: { argb: textColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; 
        
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });

      sumColumns?.forEach(col => {
        const val = Number(rowData[col]);
        if (!isNaN(val)) totals[col] += val;
      });
      currentRow++;
    });

    // ================= 💡 ردیف جمع کل =================
    if (sumColumns && sumColumns.length > 0 && data.length > 0) {
      const tRow = ws.getRow(currentRow);
      tRow.height = 35;
      
      headerKeys.forEach((key, colIndex) => {
        const cell = tRow.getCell(colIndex + 1);
        if (colIndex === 0) cell.value = 'جمع کل:';
        else if (sumColumns.includes(key)) cell.value = totals[key];
        else cell.value = '';

        cell.font = { name: 'Tahoma', bold: true, size: 12, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } }; 
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        cell.border = {
          top: { style: 'double', color: { argb: 'FF475569' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };

        if (typeof cell.value === 'number') cell.numFmt = '#,##0'; 
      });
      currentRow++;
    }

    // ================= 💡 جدول خلاصه وضعیت مالی =================
    if (extraInfo?.financialSummary) {
      currentRow += 2; 
      
      const sumTitleRow = ws.getRow(currentRow);
      ws.mergeCells(currentRow, 1, currentRow, colCount);
      sumTitleRow.height = 35;
      const sTitleCell = sumTitleRow.getCell(1);
      sTitleCell.value = 'خلاصه وضعیت مالی و صورت‌حساب نهایی';
      sTitleCell.font = { name: 'Tahoma', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
      sTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; 
      sTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sTitleCell.border = {
        top: { style: 'medium', color: { argb: 'FF1E293B' } },
        bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
        left: { style: 'medium', color: { argb: 'FF1E293B' } },
        right: { style: 'medium', color: { argb: 'FF1E293B' } }
      };
      
      const summaryData = [
        { label: 'مبنای محاسبه قرارداد:', value: extraInfo.financialSummary.billingDesc },
        { label: 'مجموع هزینه‌های قطعی:', value: extraInfo.financialSummary.totalExpenses, isNum: true },
        { label: 'مبلغ نهایی صورت‌وضعیت:', value: extraInfo.financialSummary.finalBillingAmount, isNum: true, highlight: true },
        { label: 'مجموع دریافتی از کارفرما:', value: extraInfo.financialSummary.totalReceipts, isNum: true },
        { label: `مانده نهایی (${extraInfo.financialSummary.balanceStatus}):`, value: Math.abs(extraInfo.financialSummary.balance), isNum: true, isBalance: true }
      ];

      summaryData.forEach((item) => {
        currentRow++;
        const sRow = ws.getRow(currentRow);
        sRow.height = 28;
        
        const labelEndCol = colCount > 1 ? colCount - 1 : 1;
        const valCol = colCount;

        if (colCount > 1) {
          ws.mergeCells(currentRow, 1, currentRow, labelEndCol);
        }

        const labelCell = sRow.getCell(1);
        labelCell.value = item.label;
        labelCell.font = { name: 'Tahoma', bold: true, size: 10, color: { argb: 'FF334155' } };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        labelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

        const valCell = sRow.getCell(valCol);
        valCell.value = item.value;
        
        let valColor = 'FF0F172A'; 
        let valBg = 'FFFFFFFF';
        if (item.highlight) { valColor = 'FF4F46E5'; valBg = 'FFFEE2E2'; } 
        if (item.isBalance) {
            if (extraInfo.financialSummary!.balance > 0) valColor = 'FFD97706'; 
            else if (extraInfo.financialSummary!.balance < 0) valColor = 'FFE11D48'; 
            else valColor = 'FF16A34A'; 
            valBg = 'FFF8FAFC';
        }

        valCell.font = { name: 'Tahoma', bold: item.highlight || item.isBalance, size: 11, color: { argb: valColor } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: valBg } };
        valCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        if (item.isNum) valCell.numFmt = '#,##0';
        
        for(let c = 1; c <= colCount; c++){
          const cell = sRow.getCell(c);
          cell.border = { 
            top: {style: 'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style: 'thin', color: {argb: 'FFCBD5E1'}}, 
            left: {style: 'thin', color: {argb: 'FFCBD5E1'}}, right: {style: 'thin', color: {argb: 'FFCBD5E1'}} 
          };
        }
      });
    }

    // ================= 💡 جایگاه مُهر و امضای دیجیتال =================
    if (companySettings) {
      currentRow += 2;
      const sigRow = ws.getRow(currentRow);
      sigRow.height = 100; 
      
      const contractorCol = 2; // سمت راست صفحه
      const clientCol = colCount > 2 ? colCount - 1 : colCount; // سمت چپ صفحه

      const contractorCell = sigRow.getCell(contractorCol);
      contractorCell.value = 'مُهر و امضای پیمانکار\n\n\n\n\n'; 
      contractorCell.font = { name: 'Tahoma', bold: true, size: 11, color: { argb: 'FF475569' } };
      contractorCell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };

      const clientCell = sigRow.getCell(clientCol);
      clientCell.value = 'مُهر و امضای کارفرما / مشتری\n\n\n\n\n';
      clientCell.font = { name: 'Tahoma', bold: true, size: 11, color: { argb: 'FF475569' } };
      clientCell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };

      // 💡 چاپ مُهر شرکت در اکسل
      if (stampId !== undefined) {
        ws.addImage(stampId, {
          tl: { col: contractorCol - 1 + 0.1, row: currentRow - 1 + 0.1 }, // مختصات دقیق روی کادر پیمانکار
          ext: { width: 100, height: 100 }
        });
      }

      // 💡 چاپ امضای مدیر در اکسل
      if (sigId !== undefined) {
        ws.addImage(sigId, {
          tl: { col: contractorCol - 1 + 0.4, row: currentRow - 1 + 0.3 }, // کمی شیفت به مرکز برای امضا
          ext: { width: 120, height: 60 }
        });
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};