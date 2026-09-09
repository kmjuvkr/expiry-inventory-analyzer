

export interface InventoryItemRaw {
  품목코드: string;
  품목이름: string;
  총수량: number;
  '만기일(최소)': string; // Date string YYYY-MM-DD from Excel
  창고명: string;
  '월평균 판매수량': number; // Key with space
  구매단가: number;
  '시판/방판': string;
}

export interface InventoryItem extends InventoryItemRaw { // Inherits '월평균 판매수량'
  id: string;
  category: 'food' | 'cosmetics' | 'unknown';
  expiryDate: Date;
  remainingMonths: number;
  estimatedDepletionMonths: number;
  totalValue: number;
  isAtRisk: boolean;
  daysToExpiry: number;
  earliestExpiryBatchQuantity?: number; // Quantity associated with the earliest expiry date for that item code
  isManuallyExcluded: boolean;
}

export interface ProcessedInventoryData {
  items: InventoryItem[];
  totalInventoryValue: number;
  atRiskItemsCount: number;
  atRiskInventoryValue: number;
  sheetName?: string;
  processingDate: Date;
}

export interface MonthlyComparisonSummary {
  current: {
    totalInventoryValue: number;
    atRiskItemsCount: number;
    atRiskInventoryValue: number;
    sheetName?: string;
  };
  previous: {
    totalInventoryValue: number;
    atRiskItemsCount: number;
    atRiskInventoryValue: number;
    sheetName?: string;
  };
  atRiskValueChange: number;
  atRiskValueChangePercentage: number | null;
}

export interface RiskStatusChangeSummary {
  newlyAddedItems: InventoryItem[];
  newlyRemovedItems: InventoryItem[];
}

export const ExcelColumns = {
  ITEM_CODE: '품목코드',
  ITEM_NAME: '품목이름',
  TOTAL_QUANTITY: '총수량',
  EXPIRY_DATE: '만기일(최소)',
  WAREHOUSE_NAME: '창고명',
  MONTHLY_AVERAGE_SALES: '월평균 판매수량',
  PURCHASE_PRICE: '구매단가',
  CHANNEL: '시판/방판',
  EXCLUDED_ITEM_CODE_SIPAN: '악성위험 제외 품목코드(시판)',
  EXCLUDED_ITEM_NAME_SIPAN: '악성위험 제외 품목이름(시판)',
  EXCLUDED_ITEM_CODE_BANGPAN: '악성위험 제외 품목코드(방판)',
  EXCLUDED_ITEM_NAME_BANGPAN: '악성위험 제외 품목이름(방판)',
} as const;

export type ExcelColumnKeys = keyof typeof ExcelColumns;
export type ExcelColumnValues = (typeof ExcelColumns)[ExcelColumnKeys];

export const RequiredColumns: ExcelColumnValues[] = Object.values(ExcelColumns);

export type InventoryCategory = 'food' | 'cosmetics';

export interface ManuallyExcludedRawEntry {
  '품목코드': string;
  '품목이름': string;
  '채널': '시판' | '방판';
}

// New type for the result of parsing a single sheet
export interface SheetParseResult {
  sheetName: string;
  data: InventoryItemRaw[];
  manuallyExcludedEntries: ManuallyExcludedRawEntry[];
  errors: string[]; // Errors specific to this sheet
}
