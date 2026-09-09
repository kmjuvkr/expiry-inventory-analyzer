
"use client";

import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';
import { RequiredColumns, ExcelColumns } from '@/types/inventory';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const columnDescriptions: Partial<Record<typeof ExcelColumns[keyof typeof ExcelColumns], string>> = {
  [ExcelColumns.ITEM_CODE]: "상품을 고유하게 식별하는 코드입니다. (예: '1001')",
  [ExcelColumns.ITEM_NAME]: "상품의 이름입니다. (예: '유기농 사과주스 1L')",
  [ExcelColumns.TOTAL_QUANTITY]: "현재 보유 중인 해당 상품의 총 수량입니다. (예: 150)",
  [ExcelColumns.EXPIRY_DATE]: "상품의 유통기한 또는 소비기한입니다. YYYY-MM-DD, YYYYMMDD, MM/DD/YYYY, DD/MM/YYYY 형식 중 하나여야 합니다. (예: '2024-12-31')",
  [ExcelColumns.WAREHOUSE_NAME]: "상품이 보관된 창고의 이름입니다. (예: '서울 중앙 창고')",
  [ExcelColumns.MONTHLY_AVERAGE_SALES]: "최근 월평균 판매 수량입니다. (예: 25.5). 비어있거나 숫자가 아니면 0으로 처리됩니다.",
  [ExcelColumns.PURCHASE_PRICE]: "상품의 개당 구매 단가입니다. (예: 3500)",
  [ExcelColumns.CHANNEL]: "상품의 판매 채널입니다. (예: '시판' 또는 '방판'). 이 값을 기준으로 전체 데이터를 필터링할 수 있습니다.",
  [ExcelColumns.EXCLUDED_ITEM_CODE_SIPAN]: "'시판' 채널 분석에서 특정 품목을 제외하려면, 이 열에 해당 품목의 '품목코드'를 입력합니다.",
  [ExcelColumns.EXCLUDED_ITEM_NAME_SIPAN]: "위 '악성위험 제외 품목코드(시판)'에 해당하는 품목의 이름 또는 제외 사유를 입력합니다.",
  [ExcelColumns.EXCLUDED_ITEM_CODE_BANGPAN]: "'방판' 채널 분석에서 특정 품목을 제외하려면, 이 열에 해당 품목의 '품목코드'를 입력합니다.",
  [ExcelColumns.EXCLUDED_ITEM_NAME_BANGPAN]: "위 '악성위험 제외 품목코드(방판)'에 해당하는 품목의 이름 또는 제외 사유를 입력합니다.",
};


const RequiredColumnsInfo: React.FC = () => {
  return (
    <Card className="mb-6 shadow-md">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="required-columns-info" className="border-b-0">
          <AccordionTrigger className="p-6 hover:no-underline">
            <div className="flex flex-col space-y-1.5 text-left w-full">
              <CardTitle className="text-lg font-headline flex items-center">
                <ListChecks className="inline-block h-5 w-5 mr-2 text-primary" />
                필수 컬럼명 안내
              </CardTitle>
              <CardDescription>엑셀 파일의 첫 번째 행(헤더)에 다음 컬럼들이 정확히 포함되어야 합니다. (대소문자 및 띄어쓰기)</CardDescription>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-0">
            <ul className="space-y-2 text-sm text-foreground bg-muted/30 p-4 rounded-md">
              {RequiredColumns.map(col => (
                <li key={col}>
                  <span className="font-mono font-semibold">{col}</span>
                  {columnDescriptions[col] && <p className="text-xs text-muted-foreground ml-2">{columnDescriptions[col]}</p>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              * 모든 필수 컬럼이 헤더 행에 존재해야 합니다. "악성위험 제외" 관련 컬럼들은 헤더는 필수지만, 데이터 행의 값은 비어 있을 수 있습니다.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              * "월평균 판매수량"은 값이 없거나 숫자가 아니면 0으로 처리됩니다.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default RequiredColumnsInfo;
