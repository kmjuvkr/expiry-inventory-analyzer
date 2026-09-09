
"use client";

import type { InventoryItem } from '@/types/inventory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface RiskStatusChangeTableProps {
  items: InventoryItem[];
  status: 'added' | 'removed';
}

const RiskStatusChangeTable: React.FC<RiskStatusChangeTableProps> = ({ items, status }) => {
  if (items.length === 0) {
    return <p className="text-muted-foreground p-6 text-center">
      {status === 'added' ? "이번달에 신규로 추가된 악성 위험 재고 품목이 없습니다." : "이번달에 악성 위험 재고에서 해소된 품목이 없습니다."}
    </p>;
  }

  return (
    <div className="rounded-b-lg border-t">
      <Table className="sticky-header">
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold w-[100px]">품목코드</TableHead>
            <TableHead className="font-semibold min-w-[100px]">품목이름</TableHead>
            <TableHead className="font-semibold w-[130px]">만기일(최소)</TableHead>
            <TableHead className="text-right font-semibold w-[150px]">수량(만기일/총)</TableHead>
            <TableHead className="text-right font-semibold w-[150px]">
              월평균
              <br />
              판매수량
            </TableHead>
            <TableHead className="text-right font-semibold w-[130px]">남은개월수</TableHead>
            <TableHead className="text-right font-semibold w-[150px]">
              예상소진
              <br />
              개월수
            </TableHead>
            <TableHead className="text-right font-semibold w-[130px]">총재고금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const quantityDisplay = `${item.earliestExpiryBatchQuantity?.toLocaleString() ?? 'N/A'} / ${item.총수량.toLocaleString()}`;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium w-[100px]">{item.품목코드}</TableCell>
                <TableCell className="min-w-[100px]">{item.품목이름}</TableCell>
                <TableCell className="w-[130px]">{format(item.expiryDate, 'yyyy-MM-dd')}</TableCell>
                <TableCell className="text-right w-[150px]">{quantityDisplay}</TableCell>
                <TableCell className="text-right w-[150px]">{Math.round(item['월평균 판매수량'] ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-right w-[130px]">{item.remainingMonths}</TableCell>
                <TableCell className="text-right w-[150px]">
                  {item.estimatedDepletionMonths === 9999 ? 'N/A (판매량 0)' : Math.round(item.estimatedDepletionMonths).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold w-[130px]">{item.totalValue.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default RiskStatusChangeTable;
