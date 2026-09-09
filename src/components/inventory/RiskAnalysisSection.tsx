"use client";

import type { InventoryItem, ProcessedInventoryData } from '@/types/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added Input
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Filter, List } from 'lucide-react';

interface RiskAnalysisSectionProps {
  processedData: ProcessedInventoryData | null;
}

const RiskAnalysisSection: React.FC<RiskAnalysisSectionProps> = ({ processedData }) => {
  const [showOnlyAtRisk, setShowOnlyAtRisk] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Added searchTerm state

  const allItems = useMemo(() => {
    if (processedData && processedData.items) {
      return processedData.items;
    }
    return [];
  }, [processedData]);

  const itemsToDisplay = useMemo(() => {
    let filteredItems = allItems;

    if (showOnlyAtRisk) {
      filteredItems = filteredItems.filter(item => item.isAtRisk);
    }

    if (searchTerm.trim() !== '') {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.품목코드.toLowerCase().includes(lowercasedSearchTerm) ||
        item.품목이름.toLowerCase().includes(lowercasedSearchTerm)
      );
    }
    return filteredItems;
  }, [allItems, showOnlyAtRisk, searchTerm]);

  const subtotal = useMemo(() => {
    return itemsToDisplay.reduce((sum, item) => sum + item.totalValue, 0);
  }, [itemsToDisplay]);

  const foodSubtotal = useMemo(() => {
    return itemsToDisplay
      .filter(item => item.category === 'food')
      .reduce((sum, item) => sum + item.totalValue, 0);
  }, [itemsToDisplay]);

  const cosmeticsSubtotal = useMemo(() => {
    return itemsToDisplay
      .filter(item => item.category === 'cosmetics')
      .reduce((sum, item) => sum + item.totalValue, 0);
  }, [itemsToDisplay]);


  if (!processedData) {
    return (
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">악성 위험 품목 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">데이터를 업로드하여 분석 결과를 확인하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="text-xl font-headline">악성 위험 품목 분석</CardTitle>
          <CardDescription>위험 품목은 강조 표시됩니다. (FIFO 로직 적용)</CardDescription>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto sm:max-w-md">
          <Input
            type="text"
            placeholder="품목코드 또는 품목이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-xs sm:text-sm font-semibold text-foreground text-left w-full sm:w-auto order-2 sm:order-1">
                <div>
                    {showOnlyAtRisk ? '위험 품목 합계:' : '전체 품목 합계 :'} {subtotal.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}
                </div>
                <div className="text-muted-foreground">
                    식품 소계 : {foodSubtotal.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}
                </div>
                <div className="text-muted-foreground">
                    화장품 소계 : {cosmeticsSubtotal.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}
                </div>
            </div>
            <Button
                variant={showOnlyAtRisk ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyAtRisk(!showOnlyAtRisk)}
                className="w-full sm:w-auto order-1 sm:order-2"
            >
                {showOnlyAtRisk ? <List className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
                {showOnlyAtRisk ? '전체 품목 보기' : '위험 품목만 보기'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {itemsToDisplay.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {searchTerm.trim() !== '' ? '검색된 품목이 없습니다.' : (showOnlyAtRisk ? "악성 위험 재고 품목이 없습니다." : "표시할 품목 데이터가 없습니다.")}
          </div>
        ) : (
          <div className="rounded-b-lg border-t">
            <Table className="sticky-header">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold w-[100px]">품목코드</TableHead>
                  <TableHead className="font-semibold w-[300px]">품목이름</TableHead>
                  <TableHead className="font-semibold w-[130px]">만기일(최소)</TableHead>
                  <TableHead className="text-right font-semibold w-[150px]">수량(만기일/총)</TableHead>
                  <TableHead className="text-right font-semibold w-[120px]">
                    월평균
                    <br />
                    판매수량
                  </TableHead>
                  <TableHead className="text-right font-semibold w-[120px]">남은개월수</TableHead>
                  <TableHead className="text-right font-semibold w-[120px]">
                    예상소진
                    <br />
                    개월수
                  </TableHead>
                  <TableHead className="text-right font-semibold w-[130px]">총재고금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsToDisplay.map((item) => {
                  const quantityDisplay = `${item.earliestExpiryBatchQuantity?.toLocaleString() ?? 'N/A'} / ${item.총수량.toLocaleString()}`;
                  return (
                    <TableRow
                      key={item.id}
                      className={item.isAtRisk ? 'bg-accent text-accent-foreground hover:bg-[hsl(54,100%,82%)] transition-colors duration-150' : 'hover:bg-muted/50 transition-colors duration-150'}
                    >
                      <TableCell className="font-medium w-[100px] py-3">{item.품목코드}</TableCell>
                      <TableCell className="w-[300px] py-3">{item.품목이름}</TableCell>
                      <TableCell className="w-[130px] py-3">{format(item.expiryDate, 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-right w-[150px] py-3">{quantityDisplay}</TableCell>
                      <TableCell className="text-right w-[120px] py-3">{Math.round(item['월평균 판매수량'] ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right w-[120px] py-3">{item.remainingMonths}</TableCell>
                      <TableCell className="text-right w-[120px] py-3">
                        {item.estimatedDepletionMonths === 9999 ? 'N/A (판매량 0)' : Math.round(item.estimatedDepletionMonths).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold w-[130px] py-3">{item.totalValue.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskAnalysisSection;
