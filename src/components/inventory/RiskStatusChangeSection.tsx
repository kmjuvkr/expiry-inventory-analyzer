
"use client";

import type { RiskStatusChangeSummary } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RiskStatusChangeTable from './RiskStatusChangeTable';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RiskStatusChangeSectionProps {
  comparisonResult: RiskStatusChangeSummary | null;
}

const RiskStatusChangeSection: React.FC<RiskStatusChangeSectionProps> = ({ comparisonResult }) => {
  if (!comparisonResult || (comparisonResult.newlyAddedItems.length === 0 && comparisonResult.newlyRemovedItems.length === 0)) {
    return null;
  }
  
  const { newlyAddedItems, newlyRemovedItems } = comparisonResult;

  return (
    <>
      {newlyAddedItems.length > 0 && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-destructive" />
              신규 악성 위험 품목 ({newlyAddedItems.length})
            </CardTitle>
            <CardDescription>
              지난달에는 없었으나 이번달에 새로 악성 위험 재고로 분류된 품목입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RiskStatusChangeTable items={newlyAddedItems} status="added" />
          </CardContent>
        </Card>
      )}
      
      {newlyRemovedItems.length > 0 && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center">
              <TrendingDown className="h-6 w-6 mr-2 text-green-500" />
              악성 위험 해소 품목 ({newlyRemovedItems.length})
            </CardTitle>
            <CardDescription>
              지난달에는 악성 위험 재고였으나 이번달에 위험에서 해소된 품목입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RiskStatusChangeTable items={newlyRemovedItems} status="removed" />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default RiskStatusChangeSection;
