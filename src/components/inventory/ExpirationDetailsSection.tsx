
"use client";

import type { InventoryItem, ProcessedInventoryData } from '@/types/inventory';
import ExpirationTable from './ExpirationTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { filterItemsExpiringSoon } from '@/lib/inventoryCalculations';
import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface ExpirationDetailsSectionProps {
  processedData: ProcessedInventoryData;
  title: string;
  monthsThreshold: number;
  category: 'food' | 'cosmetics';
}

const ExpirationDetailsSection: React.FC<ExpirationDetailsSectionProps> = ({ processedData, title, monthsThreshold, category }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);

  const hasCategoryItemsInDataset = useMemo(() => {
    return processedData.items.some(item => item.category === category);
  }, [processedData.items, category]);
  
  useEffect(() => {
    if (hasCategoryItemsInDataset) {
      const soonExpiringItems = filterItemsExpiringSoon(processedData.items, monthsThreshold, processedData.processingDate);
      const categoryItems = soonExpiringItems.filter(item => item.category === category);
      setItems(categoryItems);
    } else {
      setItems([]);
    }
  }, [processedData, monthsThreshold, category, hasCategoryItemsInDataset]);
  
  const iconToShow = monthsThreshold === 3 ? <TrendingUp className="h-5 w-5 mr-2 text-primary" /> : <Info className="h-5 w-5 mr-2 text-primary" />;
  const categoryName = category === 'food' ? '식품' : '화장품';
  
  const getTitleWithCount = () => {
    return `${title} - ${categoryName} (${items.length}개)`;
  };
  
  if (!hasCategoryItemsInDataset) {
    return null;
  }

  return (
    <Card className="shadow-lg mb-6">
      <CardHeader className="pb-4 pt-4 px-4 border-b">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center">
          {iconToShow}
          {getTitleWithCount()}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
         <div className="overflow-hidden rounded-b-lg">
            <ExpirationTable items={items} category={category} monthsThreshold={monthsThreshold} />
         </div>
      </CardContent>
    </Card>
  );
};

export default ExpirationDetailsSection;
