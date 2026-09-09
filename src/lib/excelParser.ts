

import * as XLSX from 'xlsx';
import type { InventoryItemRaw, ExcelColumnValues, ManuallyExcludedRawEntry, SheetParseResult } from '@/types/inventory';
import { RequiredColumns, ExcelColumns } from '@/types/inventory';
import { format, parse, isValid } from 'date-fns';

const excelSerialToDate = (serial: number): Date => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
};

export const parseExcelFile = (file: File): Promise<SheetParseResult[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) {
          reject(new Error("파일을 읽을 수 없습니다."));
          return;
        }
        const workbook = XLSX.read(new Uint8Array(arrayBuffer as ArrayBuffer), { type: 'array', cellDates: false });
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error("엑셀 파일에 시트가 없습니다."));
          return;
        }

        const allSheetResults: SheetParseResult[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            allSheetResults.push({ sheetName, data: [], manuallyExcludedEntries: [], errors: [`시트 '${sheetName}'을 찾을 수 없습니다.`] });
            continue;
          }

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[][];
          const sheetErrors: string[] = [];

          if (jsonData.length < 1) {
            allSheetResults.push({ sheetName, data: [], manuallyExcludedEntries: [], errors: [`시트 '${sheetName}'에 헤더가 없습니다.`] });
            continue;
          }
          const headerRow = jsonData[0].map(String);

          const missingColumns = RequiredColumns.filter(col => !headerRow.includes(col));
          if (missingColumns.length > 0) {
            sheetErrors.push(...missingColumns.map(col => `시트 '${sheetName}'의 '${col}' 컬럼이 없습니다.`));
          }

          if (jsonData.length < 2 && sheetErrors.length === 0) {
             allSheetResults.push({ sheetName, data: [], manuallyExcludedEntries: [], errors: [`시트 '${sheetName}'에 데이터가 없습니다 (헤더만 존재).`, ...sheetErrors] });
             continue;
          }
          
          if (sheetErrors.length > 0) {
             allSheetResults.push({ sheetName, data: [], manuallyExcludedEntries: [], errors: sheetErrors });
             continue;
          }
          
          const columnMappingToRawKeys: { [key in ExcelColumnValues]?: keyof InventoryItemRaw } = {
            [ExcelColumns.ITEM_CODE]: '품목코드',
            [ExcelColumns.ITEM_NAME]: '품목이름',
            [ExcelColumns.TOTAL_QUANTITY]: '총수량',
            [ExcelColumns.EXPIRY_DATE]: '만기일(최소)',
            [ExcelColumns.WAREHOUSE_NAME]: '창고명',
            [ExcelColumns.MONTHLY_AVERAGE_SALES]: '월평균 판매수량',
            [ExcelColumns.PURCHASE_PRICE]: '구매단가',
            [ExcelColumns.CHANNEL]: '시판/방판',
          };

          const parsedData: InventoryItemRaw[] = [];
          const manuallyExcludedEntries: ManuallyExcludedRawEntry[] = [];

          const excludedSipanCodeIndex = headerRow.indexOf(ExcelColumns.EXCLUDED_ITEM_CODE_SIPAN);
          const excludedSipanNameIndex = headerRow.indexOf(ExcelColumns.EXCLUDED_ITEM_NAME_SIPAN);
          const excludedBangpanCodeIndex = headerRow.indexOf(ExcelColumns.EXCLUDED_ITEM_CODE_BANGPAN);
          const excludedBangpanNameIndex = headerRow.indexOf(ExcelColumns.EXCLUDED_ITEM_NAME_BANGPAN);

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue; 

            const item: Partial<InventoryItemRaw> = {};
            let rowHasError = false;
            let isInventoryItemRow = false; 

            headerRow.forEach((header, index) => {
              const rawKey = columnMappingToRawKeys[header as ExcelColumnValues] as keyof InventoryItemRaw;
              
              if (!rawKey) return;

              let cellValue = row[index];
              
              if (rawKey === '만기일(최소)') { 
                if (typeof cellValue === 'number') {
                  try {
                    const dateObj = excelSerialToDate(cellValue);
                    cellValue = format(dateObj, 'yyyy-MM-dd');
                  } catch (e) {
                    sheetErrors.push(`시트 '${sheetName}', 행 ${i + 1}, '${header}': 유효하지 않은 Excel 날짜 번호입니다. (${row[index]})`);
                    rowHasError = true;
                  }
                } else if (typeof cellValue === 'string') {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(cellValue)) {
                     let parsedDate;
                     if (/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(cellValue)) { 
                        const parts = cellValue.split('/');
                        parsedDate = parse(`${parts[0]}/${parts[1]}/${parts[2]}`, 'MM/dd/yyyy', new Date());
                        if (!isValid(parsedDate)) {
                            parsedDate = parse(cellValue, 'dd/MM/yyyy', new Date());
                        }
                     } else {
                        parsedDate = parse(cellValue, 'yyyyMMdd', new Date()); 
                        if (!isValid(parsedDate)) {
                           parsedDate = parse(cellValue, 'yyMMdd', new Date()); 
                        }
                     }

                     if (isValid(parsedDate)) {
                        cellValue = format(parsedDate, 'yyyy-MM-dd');
                     } else {
                        sheetErrors.push(`시트 '${sheetName}', 행 ${i + 1}, '${header}': 날짜는 YYYY-MM-DD, YYYYMMDD, YYMMDD, MM/DD/YYYY, 또는 DD/MM/YYYY 형식이어야 합니다. (${row[index]})`);
                        rowHasError = true;
                     }
                  }
                } else if (cellValue instanceof Date && isValid(cellValue)) {
                    cellValue = format(cellValue, 'yyyy-MM-dd');
                } else {
                  sheetErrors.push(`시트 '${sheetName}', 행 ${i + 1}, '${header}': 날짜 값이 필요합니다. (${cellValue})`);
                  rowHasError = true;
                }
                item[rawKey] = cellValue as any;
              } else if (rawKey === '총수량' || rawKey === '월평균 판매수량' || rawKey === '구매단가') {
                const numValue = Number(cellValue);
                if (isNaN(numValue) || cellValue === null || String(cellValue).trim() === '') {
                  if (rawKey === '월평균 판매수량' && (cellValue === null || String(cellValue).trim() === '')) {
                    item[rawKey as keyof InventoryItemRaw] = 0 as any;
                  } else {
                    sheetErrors.push(`시트 '${sheetName}', 행 ${i + 1}, '${header}': 숫자 값이 필요합니다. (${cellValue})`);
                    rowHasError = true;
                  }
                } else {
                   item[rawKey as keyof InventoryItemRaw] = numValue as any;
                }
              } else {
                 item[rawKey as keyof InventoryItemRaw] = String(cellValue !== null && cellValue !== undefined ? cellValue : '') as any;
              }
            });
            
            const requiredCoreColumns: (keyof InventoryItemRaw)[] = [
              '품목코드', '품목이름', '총수량', '만기일(최소)', '창고명', '구매단가', '시판/방판'
            ];

            const allCorePresent = requiredCoreColumns.every(coreKey => {
              const value = item[coreKey as keyof typeof item];
              return value !== undefined && value !== null && ( (typeof value === 'string') ? value.trim() !== '' : true );
            });

            if (allCorePresent) {
              isInventoryItemRow = true;
            }

            if (!rowHasError && isInventoryItemRow) {
              if (typeof item['월평균 판매수량'] !== 'number' || isNaN(item['월평균 판매수량'])) {
                  item['월평균 판매수량'] = 0;
              }
              parsedData.push(item as InventoryItemRaw);
            }

            // 시판 제외 품목 처리
            if (excludedSipanCodeIndex !== -1) {
              const code = row[excludedSipanCodeIndex];
              if (code && String(code).trim()) {
                manuallyExcludedEntries.push({
                  '품목코드': String(code).trim(),
                  '품목이름': excludedSipanNameIndex !== -1 ? String(row[excludedSipanNameIndex] ?? '').trim() : '',
                  '채널': '시판'
                });
              }
            }

            // 방판 제외 품목 처리
            if (excludedBangpanCodeIndex !== -1) {
              const code = row[excludedBangpanCodeIndex];
              if (code && String(code).trim()) {
                manuallyExcludedEntries.push({
                  '품목코드': String(code).trim(),
                  '품목이름': excludedBangpanNameIndex !== -1 ? String(row[excludedBangpanNameIndex] ?? '').trim() : '',
                  '채널': '방판'
                });
              }
            }
          }
          allSheetResults.push({ sheetName, data: parsedData, manuallyExcludedEntries, errors: sheetErrors });
        }
        resolve(allSheetResults);

      } catch (error) {
        console.error("엑셀 파싱 오류:", error);
        reject(new Error(`엑셀 파일 처리 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    reader.onerror = (error) => {
      console.error("파일 읽기 오류:", error);
      reject(new Error("파일 읽기 중 오류가 발생했습니다."));
    };
    reader.readAsArrayBuffer(file);
  });
};
