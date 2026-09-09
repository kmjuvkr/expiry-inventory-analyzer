
"use client";

import type { ManuallyExcludedRawEntry } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListChecks } from 'lucide-react';
import { useMemo } from 'react';

interface ManualExclusionSectionProps {
  excludedEntries: ManuallyExcludedRawEntry[] | null;
  channelFilter: 'all' | '시판' | '방판';
}

const ManualExclusionSection: React.FC<ManualExclusionSectionProps> = ({ excludedEntries, channelFilter }) => {
  const itemsToDisplay = useMemo(() => {
    const allEntries = excludedEntries || [];
    if (channelFilter === 'all') {
      return allEntries;
    }
    return allEntries.filter((entry) => entry['채널'] === channelFilter);
  }, [excludedEntries, channelFilter]);


  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center">
          <ListChecks className="h-6 w-6 mr-2 text-primary" />
          악성 위험 재고 수동 제외 품목 ({itemsToDisplay.length}건)
        </CardTitle>
        <CardDescription>
          엑셀 파일의 "악성위험 제외 품목코드(시판/방판)" 컬럼에 기재된 품목 목록입니다.
          필터링된 채널에 해당하는 품목코드는 악성 위험 재고 분석에서 제외됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {itemsToDisplay.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            수동으로 제외된 품목이 없습니다.
          </div>
        ) : (
          <div className="rounded-b-lg border-t">
            <Table className="sticky-header">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold w-[180px]">제외된 품목코드</TableHead>
                  <TableHead className="font-semibold min-w-[250px]">제외된 품목이름</TableHead>
                  <TableHead className="font-semibold w-[100px]">채널</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsToDisplay.map((entry, index) => (
                  <TableRow key={`${entry['품목코드']}-${entry['채널']}-${index}`}>
                    <TableCell className="font-medium w-[180px]">{entry['품목코드']}</TableCell>
                    <TableCell className="min-w-[250px]">{entry['품목이름']}</TableCell>
                    <TableCell className="w-[100px]">{entry['채널']}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualExclusionSection;
