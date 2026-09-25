import Papa from 'papaparse';

export const exportToJson = (data: any[], fileName: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_DigiMatin.json`;
  link.click();
};

export const exportToCsv = (data: any[], fileName: string) => {
  const csvString = Papa.unparse(data);
  // اضافه کردن BOM برای اینکه فایل در اکسل ویندوز با فرمت UTF-8 و حروف فارسی درست باز شود
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_DigiMatin.csv`;
  link.click();
};