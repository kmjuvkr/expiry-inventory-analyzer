
import type { InventoryItemRaw, InventoryItem, ProcessedInventoryData, MonthlyComparisonSummary, RiskStatusChangeSummary } from '@/types/inventory';
import { differenceInMonths, startOfDay, parse, isValid, format, differenceInCalendarDays } from 'date-fns';

export const processInventoryItems = (rawItems: InventoryItemRaw[], excludedItemCodes: Set<string>, processingDate: Date = new Date()): InventoryItem[] => {
  const today = startOfDay(processingDate);
  return rawItems.map((rawItem, index) => {
    let category: 'food' | 'cosmetics' | 'unknown' = 'unknown';
    if (String(rawItem.품목코드).startsWith('1')) {
      category = 'food';
    } else if (String(rawItem.품목코드).startsWith('2')) {
      category = 'cosmetics';
    }

    let expiryDateObj: Date;
    const parsedDate = parse(rawItem['만기일(최소)'], 'yyyy-MM-dd', new Date());
    if (isValid(parsedDate)) {
      expiryDateObj = startOfDay(parsedDate);
    } else {
      expiryDateObj = startOfDay(new Date('9999-12-31')); 
    }
    
    const daysToExpiry = expiryDateObj >= today ? differenceInCalendarDays(expiryDateObj, today) : 0;
    const totalValue = rawItem.총수량 * rawItem.구매단가;
    const isManuallyExcluded = excludedItemCodes.has(String(rawItem.품목코드).trim());

    // isAtRisk is now calculated centrally in aggregateItemsByCode, so we set a default here.
    return {
      ...rawItem,
      id: `${rawItem.품목코드}-${rawItem.창고명 || index}-${rawItem['만기일(최소)']}-${rawItem.총수량}-${new Date().getTime()}-${Math.random().toString(36).substring(7)}`, 
      category,
      expiryDate: expiryDateObj,
      remainingMonths: 0, // Will be calculated accurately in aggregation
      estimatedDepletionMonths: 0, // Will be calculated accurately in aggregation
      totalValue,
      isAtRisk: false, // Default value, source of truth is in aggregateItemsByCode
      daysToExpiry,
      earliestExpiryBatchQuantity: rawItem.총수량, 
      isManuallyExcluded,
    };
  });
};

export const calculateProcessedInventoryData = (items: InventoryItem[], sheetName?: string, processingDate: Date = new Date()): ProcessedInventoryData => {
  const aggregatedItems = aggregateItemsByCode(items, processingDate); 

  const totalInventoryValue = aggregatedItems.reduce((sum, item) => sum + item.totalValue, 0);
  
  const atRiskItems = aggregatedItems.filter(item => item.isAtRisk);
  const atRiskInventoryValue = atRiskItems.reduce((sum, item) => sum + item.totalValue, 0);
  const atRiskItemsCount = new Set(atRiskItems.map(item => item.품목코드)).size;

  return {
    items: aggregatedItems,
    totalInventoryValue,
    atRiskItemsCount,
    atRiskInventoryValue,
    sheetName,
    processingDate
  };
};

export const generateMonthlyComparison = (
  currentData: ProcessedInventoryData | null,
  previousData: ProcessedInventoryData | null
): MonthlyComparisonSummary => {
  const summary: MonthlyComparisonSummary = {
    current: {
      totalInventoryValue: currentData?.totalInventoryValue || 0,
      atRiskItemsCount: currentData?.atRiskItemsCount || 0,
      atRiskInventoryValue: currentData?.atRiskInventoryValue || 0,
      sheetName: currentData?.sheetName
    },
    previous: {
      totalInventoryValue: previousData?.totalInventoryValue || 0,
      atRiskItemsCount: previousData?.atRiskItemsCount || 0,
      atRiskInventoryValue: previousData?.atRiskInventoryValue || 0,
      sheetName: previousData?.sheetName
    },
    atRiskValueChange: 0,
    atRiskValueChangePercentage: null,
  };

  summary.atRiskValueChange = summary.current.atRiskInventoryValue - summary.previous.atRiskInventoryValue;

  if (summary.previous.atRiskInventoryValue !== 0) {
    summary.atRiskValueChangePercentage = (summary.atRiskValueChange / summary.previous.atRiskInventoryValue) * 100;
  } else if (summary.current.atRiskInventoryValue > 0 && summary.previous.atRiskInventoryValue === 0) {
    summary.atRiskValueChangePercentage = Infinity; 
  } else if (summary.current.atRiskInventoryValue === 0 && summary.previous.atRiskInventoryValue === 0) {
    summary.atRiskValueChangePercentage = 0;
  }

  return summary;
};


export const filterItemsExpiringSoon = (items: InventoryItem[], monthsThreshold: number, processingDate: Date = new Date()): InventoryItem[] => {
  const today = startOfDay(processingDate);
  return items.filter(item => {
    if (item.isManuallyExcluded) return false; 
    const itemExpiryDate = startOfDay(item.expiryDate);
    const monthsRemaining = differenceInMonths(itemExpiryDate, today);
    return itemExpiryDate > today && monthsRemaining < monthsThreshold;
  });
};

export const compareRiskStatus = (
  currentData: ProcessedInventoryData | null,
  previousData: ProcessedInventoryData | null
): RiskStatusChangeSummary => {
  const result: RiskStatusChangeSummary = {
    newlyAddedItems: [],
    newlyRemovedItems: [],
  };

  if (!currentData || !previousData) {
    return result;
  }

  const currentAtRiskCodes = new Set(
    currentData.items.filter(item => item.isAtRisk).map(item => item.품목코드)
  );

  const previousAtRiskCodes = new Set(
    previousData.items.filter(item => item.isAtRisk).map(item => item.품목코드)
  );
  
  const currentItemsMap = new Map(currentData.items.map(item => [item.품목코드, item]));

  // Find newly added items
  const newlyAddedItemCodes = new Set<string>();
  for (const item of currentData.items) {
    if (item.isAtRisk && !previousAtRiskCodes.has(item.품목코드)) {
      if (!newlyAddedItemCodes.has(item.품목코드)) {
        result.newlyAddedItems.push(item);
        newlyAddedItemCodes.add(item.품목코드);
      }
    }
  }

  // Find newly removed items
  const newlyRemovedItemCodes = new Set<string>();
  for (const prevItemCode of previousAtRiskCodes) {
    if (!currentAtRiskCodes.has(prevItemCode)) {
      if (!newlyRemovedItemCodes.has(prevItemCode)) {
        const currentItemData = currentItemsMap.get(prevItemCode);
        if (currentItemData) {
            result.newlyRemovedItems.push(currentItemData);
            newlyRemovedItemCodes.add(prevItemCode);
        }
      }
    }
  }

  return result;
};

export const aggregateItemsByCode = (items: InventoryItem[], processingDate: Date = new Date()): InventoryItem[] => {
  const itemsByCode = new Map<string, InventoryItem[]>();
  const today = startOfDay(processingDate);

  items.forEach(item => {
    if (!itemsByCode.has(item.품목코드)) {
      itemsByCode.set(item.품목코드, []);
    }
    itemsByCode.get(item.품목코드)!.push(item);
  });

  const aggregatedList: InventoryItem[] = [];

  itemsByCode.forEach((group, itemCode) => {
    if (group.length === 0) return;

    const sortedLots = [...group].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    const baseItem = sortedLots[0]; 
    
    const isManuallyExcluded = group.some(lot => lot.isManuallyExcluded);
    const monthlySales = baseItem['월평균 판매수량'];
    const totalQuantity = group.reduce((sum, lot) => sum + lot.총수량, 0);
    const totalValue = group.reduce((sum, lot) => sum + lot.totalValue, 0);
    
    let isAtRisk = false;
    if (!isManuallyExcluded) {
      if (monthlySales <= 0) {
        isAtRisk = totalQuantity > 0;
      } else {
        let cumulativeQty = 0;
        for (const lot of sortedLots) {
          cumulativeQty += lot.총수량;
          const monthsToSellCumulative = cumulativeQty / monthlySales;
          
          const daysUntilLotExpires = differenceInCalendarDays(lot.expiryDate, today);
          // Prevent division by zero or negative days resulting in positive months
          const monthsUntilLotExpires = daysUntilLotExpires > 0 ? daysUntilLotExpires / 30.4375 : 0;
          
          if (monthsToSellCumulative > monthsUntilLotExpires) {
            isAtRisk = true;
            break;
          }
        }
      }
    }

    const overallMinExpiryDate = baseItem.expiryDate;
    const earliestBatchQty = group
      .filter(lot => lot.expiryDate.getTime() === overallMinExpiryDate.getTime())
      .reduce((sum, lot) => sum + lot.총수량, 0);

    const displayDaysToExpiry = differenceInCalendarDays(overallMinExpiryDate, today);
    
    aggregatedList.push({
      ...baseItem,
      품목코드: itemCode,
      총수량: totalQuantity,
      totalValue: totalValue,
      expiryDate: overallMinExpiryDate,
      '만기일(최소)': format(overallMinExpiryDate, 'yyyy-MM-dd'),
      earliestExpiryBatchQuantity: earliestBatchQty,
      remainingMonths: Math.floor(displayDaysToExpiry > 0 ? displayDaysToExpiry / 30.4375 : 0),
      daysToExpiry: displayDaysToExpiry,
      estimatedDepletionMonths: (monthlySales > 0) ? totalQuantity / monthlySales : 9999,
      isManuallyExcluded: isManuallyExcluded,
      isAtRisk: isAtRisk,
      id: `${itemCode}-agg-${overallMinExpiryDate.getTime()}`,
    });
  });

  return aggregatedList;
};
