
"use client";

import type { InventoryItem, InventoryCategory } from '@/types/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ExpirationTableProps {
  items: InventoryItem[];
  category: InventoryCategory;
  monthsThreshold: number;
}

const ExpirationTable: React.FC<ExpirationTableProps> = ({ items, category, monthsThreshold }) => {
  if (items.length === 0) {
    return <p className="text-muted-foreground p-6 text-center">해당 카테고리에 {monthsThreshold}개월 내 만기되는 품목이 없습니다.</p>;
  }

  return (
    <div className=""> {/* Removed max-h-[400px] overflow-auto */}
      <Table className="sticky-header">
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold w-[100px]">품목코드</TableHead>
            <TableHead className="font-semibold min-w-[80px]">품목이름</TableHead>
            <TableHead className="font-semibold w-[120px]">만기일(최소)</TableHead>
            <TableHead className="text-right font-semibold w-[120px]">남은 개월수</TableHead>
            <TableHead className="text-right font-semibold w-[150px]">수량(만기일/총)</TableHead>
            <TableHead className="text-right font-semibold w-[120px]">구매단가</TableHead>
            <TableHead className="text-right font-semibold w-[140px]">총재고금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const expiryDateDisplay = format(item.expiryDate, 'yyyy-MM-dd');
            const quantityDisplay = `${item.earliestExpiryBatchQuantity?.toLocaleString() ?? 'N/A'} / ${item.총수량.toLocaleString()}`;
            
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium w-[100px]">{item.품목코드}</TableCell>
                <TableCell className="min-w-[80px]">{item.품목이름}</TableCell>
                <TableCell className="w-[120px]">{expiryDateDisplay}</TableCell>
                <TableCell className="text-right w-[120px]">{item.remainingMonths}개월</TableCell>
                <TableCell className="text-right w-[150px]">{quantityDisplay}</TableCell>
                <TableCell className="text-right w-[120px]">{item.구매단가.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}</TableCell>
                <TableCell className="text-right font-semibold w-[140px]">{item.totalValue.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExpirationTable;
