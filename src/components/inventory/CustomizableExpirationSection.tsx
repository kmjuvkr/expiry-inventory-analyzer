"use client";

import { useState, useMemo } from 'react';
import type { ProcessedInventoryData, InventoryItem } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExpirationTable from './ExpirationTable';
import { filterItemsExpiringSoon } from '@/lib/inventoryCalculations';
import { Info } from 'lucide-react';

interface CustomizableExpirationSectionProps {
  processedData: ProcessedInventoryData | null;
}

const CustomizableExpirationSection: React.FC<CustomizableExpirationSectionProps> = ({ processedData }) => {
  const [months, setMonths] = useState(8);

  const expiringItems = useMemo(() => {
    if (!processedData) return [];
    return filterItemsExpiringSoon(processedData.items, months, processedData.processingDate);
  }, [processedData, months]);

  const foodItems = useMemo(() => expiringItems.filter(item => item.category === 'food'), [expiringItems]);
  const cosmeticsItems = useMemo(() => expiringItems.filter(item => item.category === 'cosmetics'), [expiringItems]);
  
  const totalFoodItemsCount = useMemo(() => {
    if (!processedData) return 0;
    return processedData.items.filter(item => item.category === 'food').length;
  }, [processedData]);

  const totalCosmeticsItemsCount = useMemo(() => {
    if (!processedData) return 0;
    return processedData.items.filter(item => item.category === 'cosmetics').length;
  }, [processedData]);

  if (!processedData) {
    return null;
  }

  const foodTitle = `식품 (${foodItems.length}/${totalFoodItemsCount} 품목)`;
  const cosmeticsTitle = `화장품 (${cosmeticsItems.length}/${totalCosmeticsItemsCount} 품목)`;

  return (
    <Card className="shadow-lg mb-6">
      <CardHeader className="pb-4 pt-4 px-4 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center">
            <Info className="h-5 w-5 mr-2 text-primary" />
            {months}개월 내 만기 품목 현황 (이번달)
          </CardTitle>
          <Select onValueChange={(value) => setMonths(parseInt(value, 10))} defaultValue={String(months)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 13 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>{i} 개월</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 space-y-4">
          {totalFoodItemsCount > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-2">{foodTitle}</h3>
              <div className="overflow-hidden rounded-lg border">
                <ExpirationTable items={foodItems} category="food" monthsThreshold={months} />
              </div>
            </div>
          )}
          {totalCosmeticsItemsCount > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-2">{cosmeticsTitle}</h3>
              <div className="overflow-hidden rounded-lg border">
                <ExpirationTable items={cosmeticsItems} category="cosmetics" monthsThreshold={months} />
              </div>
            </div>
          )}
          {totalFoodItemsCount === 0 && totalCosmeticsItemsCount === 0 && (
             <p className="text-muted-foreground p-6 text-center">해당 기간 내 만기되는 품목이 없습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomizableExpirationSection;
