
"use client";

import type { MonthlyComparisonSummary } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SummaryCardsSectionProps {
  summary: MonthlyComparisonSummary | null;
  channelFilter: 'all' | '시판' | '방판';
  onChannelFilterChange: (value: 'all' | '시판' | '방판') => void;
  analysisTriggered: boolean;
}

const SummaryCard: React.FC<{ title: string; currentValue: string | number; previousValue?: string | number; unit?: string; description?: string; changeValue?: string | number; changePercentage?: number | null; positiveIsGood?: boolean }> = ({
  title,
  currentValue,
  previousValue,
  unit = '',
  description,
  changeValue,
  changePercentage,
  positiveIsGood = true
}) => {
  const formatNumber = (num: string | number | undefined | null) => {
    if (num === undefined || num === null) return '-';
    if (typeof num === 'string') return num;
    if (num === Infinity || num === -Infinity) return 'N/A';
    return num.toLocaleString(undefined, { maximumFractionDigits: unit === '%' ? 1: 0 });
  };

  const getChangeIcon = () => {
    if (changePercentage === null || changePercentage === undefined || changeValue === 0 || changePercentage === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const isPositiveChange = changePercentage > 0;
    if ((isPositiveChange && positiveIsGood) || (!isPositiveChange && !positiveIsGood)) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };
  
  const changeColorClass = changePercentage === null || changePercentage === undefined || changeValue === 0 || changePercentage === 0 ? 'text-muted-foreground' :
    ((changePercentage > 0 && positiveIsGood) || (changePercentage < 0 && !positiveIsGood)) ? 'text-green-500' : 'text-destructive';


  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {formatNumber(currentValue)}{unit}
        </div>
        {previousValue !== undefined && (
          <p className="text-xs text-muted-foreground">
            전월: {formatNumber(previousValue)}{unit}
          </p>
        )}
        {description && (
           <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {(changeValue !== undefined || changePercentage !== undefined) && (
          <div className={`text-xs flex items-center mt-1 ${changeColorClass}`}>
            {getChangeIcon()}
            <span className="ml-1">
              {changeValue !== undefined && formatNumber(changeValue) + (unit === '개' || unit === '원' ? unit : '')}
              {changeValue !== undefined && changePercentage !== undefined && changePercentage !== null && " "}
              {changePercentage !== undefined && changePercentage !== null && `(${formatNumber(changePercentage)}%)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const SummaryCardsSection: React.FC<SummaryCardsSectionProps> = ({ summary, channelFilter, onChannelFilterChange, analysisTriggered }) => {
  if (!summary) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-headline">월별 비교 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">데이터를 업로드하여 요약 정보를 확인하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-headline font-semibold text-foreground">월별 비교 요약</h2>
        {analysisTriggered && (
          <RadioGroup
            onValueChange={onChannelFilterChange}
            value={channelFilter}
            className="flex items-center space-x-4 border p-2 rounded-md bg-muted/50"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="r-all" />
              <Label htmlFor="r-all" className="cursor-pointer">전체</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="시판" id="r-sipan" />
              <Label htmlFor="r-sipan" className="cursor-pointer">시판</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="방판" id="r-bangpan" />
              <Label htmlFor="r-bangpan" className="cursor-pointer">방판</Label>
            </div>
          </RadioGroup>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <SummaryCard
          title="총 재고 금액 (이번달)"
          currentValue={summary.current.totalInventoryValue}
          previousValue={summary.previous.totalInventoryValue}
          unit="원"
          positiveIsGood={false} // Lower inventory value might be good or bad depending on context
        />
        <SummaryCard
          title="악성 위험 재고 품목 수"
          currentValue={summary.current.atRiskItemsCount}
          previousValue={summary.previous.atRiskItemsCount}
          unit="개"
          positiveIsGood={false}
        />
        <SummaryCard
          title="악성 위험 재고 금액"
          currentValue={summary.current.atRiskInventoryValue}
          previousValue={summary.previous.atRiskInventoryValue}
          unit="원"
          positiveIsGood={false}
        />
        <SummaryCard
          title="악성 위험 재고 증감 금액"
          currentValue={summary.atRiskValueChange}
          unit="원"
          description="이번달 – 이전달"
          positiveIsGood={false}
        />
        <SummaryCard
          title="악성 위험 재고 증감률"
          currentValue={summary.atRiskValueChangePercentage === Infinity ? 'N/A' : (summary.atRiskValueChangePercentage ?? 0) }
          unit={summary.atRiskValueChangePercentage === Infinity ? "" : "%"}
          description="(증감금액 ÷ 이전달 금액) × 100"
          positiveIsGood={false}
        />
      </div>
    </div>
  );
};

export default SummaryCardsSection;
