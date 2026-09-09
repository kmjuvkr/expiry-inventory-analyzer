
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import FileUploadSection from '@/components/inventory/FileUploadSection';
import SummaryCardsSection from '@/components/inventory/SummaryCardsSection';
import TrendGraphsSection from '@/components/inventory/TrendGraphsSection';
import CustomizableExpirationSection from '@/components/inventory/CustomizableExpirationSection';
import RiskAnalysisSection from '@/components/inventory/RiskAnalysisSection';
import ManualExclusionSection from '@/components/inventory/ManualExclusionSection';
import RequiredColumnsInfo from '@/components/inventory/RequiredColumnsInfo';
import RiskStatusChangeSection from '@/components/inventory/RiskStatusChangeSection';
import { parseExcelFile } from '@/lib/excelParser';
import { processInventoryItems, calculateProcessedInventoryData, generateMonthlyComparison, filterItemsExpiringSoon, compareRiskStatus } from '@/lib/inventoryCalculations';
import type { ProcessedInventoryData, MonthlyComparisonSummary, ManuallyExcludedRawEntry, SheetParseResult, InventoryItem, InventoryItemRaw, RiskStatusChangeSummary } from '@/types/inventory';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, PlayCircle, FileDown, FileSpreadsheet, FileCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generatePdf } from '@/lib/pdfGenerator';
import type jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';


export default function InventoryAnalysisPage() {
  const [previousMonthUploadResult, setPreviousMonthUploadResult] = useState<SheetParseResult | null>(null);
  const [currentMonthUploadResult, setCurrentMonthUploadResult] = useState<SheetParseResult[] | null>(null);
  
  const [processedPreviousDataForComparison, setProcessedPreviousDataForComparison] = useState<ProcessedInventoryData | null>(null);
  const [processedCurrentDataForComparison, setProcessedCurrentDataForComparison] = useState<ProcessedInventoryData | null>(null);
  
  const [annualTrendData, setAnnualTrendData] = useState<ProcessedInventoryData[] | null>(null);

  const [monthlySummary, setMonthlySummary] = useState<MonthlyComparisonSummary | null>(null);
  const [riskStatusChanges, setRiskStatusChanges] = useState<RiskStatusChangeSummary | null>(null);


  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [htmlLoading, setHtmlLoading] = useState(false);


  const [prevFileStatus, setPrevFileStatus] = useState<string | null>(null);
  const [currFileStatus, setCurrFileStatus] = useState<string | null>(null);
  
  const [channelFilter, setChannelFilter] = useState<'all' | '시판' | '방판'>('all');


  const { toast } = useToast();

  const reportContentRef = useRef<HTMLDivElement>(null);
  const fileUploadSectionRef = useRef<HTMLDivElement>(null);
  const requiredColumnsInfoRef = useRef<HTMLDivElement>(null);
  const analysisTriggerCardRef = useRef<HTMLDivElement>(null);
  const loadingStateRef = useRef<HTMLDivElement>(null);
  const noDataStateRef = useRef<HTMLDivElement>(null);
  const summaryCardsSectionRef = useRef<HTMLDivElement>(null);
  const trendGraphSectionRef = useRef<HTMLDivElement>(null); 
  const customizableExpirationSectionRef = useRef<HTMLDivElement>(null);
  const riskAnalysisSectionRef = useRef<HTMLDivElement>(null);
  const manualExclusionSectionRef = useRef<HTMLDivElement>(null);
  const riskStatusChangeSectionRef = useRef<HTMLDivElement>(null);
  const noResultsStateRef = useRef<HTMLDivElement>(null);

  const [portalNode, setPortalNode] = useState<Element | null>(null);

  useEffect(() => {
    const target = document.getElementById('header-buttons-portal-target');
    setPortalNode(target);
  }, []);

  useEffect(() => {
    if (analysisTriggered) {
      handleStartAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter]);


  const handleFileUpload = async (file: File, type: 'previous' | 'current') => {
    setFileUploadLoading(true);
    type === 'previous' ? setPrevFileStatus('업로드 중...') : setCurrFileStatus('업로드 중...');
    
    setAnalysisTriggered(false);
    setMonthlySummary(null);
    setRiskStatusChanges(null);
    setProcessedPreviousDataForComparison(null);
    setProcessedCurrentDataForComparison(null);
    setAnnualTrendData(null);
    setPdfLoading(false);
    setExcelLoading(false);
    setHtmlLoading(false);

    if (type === 'previous') {
      setPreviousMonthUploadResult(null);
    } else {
      setCurrentMonthUploadResult(null);
    }

    try {
      const sheetResults = await parseExcelFile(file);
      let combinedErrors: string[] = [];
      sheetResults.forEach(sr => combinedErrors.push(...sr.errors));

      if (combinedErrors.length > 0) {
        combinedErrors.forEach(err => toast({ title: "파일 처리 오류", description: err, variant: "destructive" }));
        const statusMsg = `오류 (${combinedErrors.length}건). 파일 이름: ${file.name}`;
        type === 'previous' ? setPrevFileStatus(statusMsg) : setCurrFileStatus(statusMsg);
      } else {
        if (type === 'previous') {
          if (sheetResults.length > 0) {
            setPreviousMonthUploadResult(sheetResults[0]); 
            setPrevFileStatus(`완료: ${file.name} (시트: ${sheetResults[0].sheetName}, ${sheetResults[0].data.length} 항목, 제외 ${sheetResults[0].manuallyExcludedEntries.length} 항목)`);
            toast({ title: "파일 업로드 성공", description: `${file.name} (${sheetResults[0].sheetName}) 파일이 성공적으로 처리되었습니다.` });
          } else {
             setPrevFileStatus(`실패: 파일에 유효한 시트가 없습니다. 파일 이름: ${file.name}`);
             toast({ title: "파일 업로드 실패", description: "파일에 유효한 시트가 없습니다.", variant: "destructive" });
          }
        } else { 
          setCurrentMonthUploadResult(sheetResults);
          const totalItems = sheetResults.reduce((sum, sr) => sum + sr.data.length, 0);
          const totalExcluded = sheetResults.reduce((sum, sr) => sum + sr.manuallyExcludedEntries.length, 0);
          setCurrFileStatus(`완료: ${file.name} (${sheetResults.length} 시트, 총 ${totalItems} 항목, 총 제외 ${totalExcluded} 항목)`);
          toast({ title: "파일 업로드 성공", description: `${file.name} (${sheetResults.length}개 시트) 파일이 성공적으로 처리되었습니다.` });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "파일 업로드 실패", description: errorMessage, variant: "destructive" });
      const statusMsg = `실패: ${errorMessage}. 파일 이름: ${file.name}`;
      type === 'previous' ? setPrevFileStatus(statusMsg) : setCurrFileStatus(statusMsg);
    } finally {
      setFileUploadLoading(false);
    }
  };

  const getProcessingDateFromSheetName = (sheetName?: string): Date => {
    if (sheetName) {
      const parsedDate = parse(sheetName, 'yy.M월', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date(); // Fallback to current date
  };

  const processAllDataInternal = useCallback(() => {
    let prevDataForComparison: ProcessedInventoryData | null = null;
    let currDataForComparison: ProcessedInventoryData | null = null;
    let newAnnualTrendData: ProcessedInventoryData[] = [];
    
    const getExcludedCodesSet = (entries: ManuallyExcludedRawEntry[]): Set<string> => {
        let filteredEntries = entries;
        if (channelFilter === 'all') {
           return new Set(entries.map(entry => entry['품목코드'].trim()).filter(Boolean));
        }
        filteredEntries = entries.filter(entry => entry['채널'] === channelFilter);
        return new Set(filteredEntries.map(entry => entry['품목코드'].trim()).filter(Boolean));
    };

    const filterRawData = (data: InventoryItemRaw[]) => {
      if (channelFilter === 'all') {
        return data;
      }
      return data.filter(item => item['시판/방판'] === channelFilter);
    };


    if (currentMonthUploadResult && currentMonthUploadResult.length > 0) {
      newAnnualTrendData = currentMonthUploadResult.map(sheetResult => {
        const processingDate = getProcessingDateFromSheetName(sheetResult.sheetName);
        const excludedCodes = getExcludedCodesSet(sheetResult.manuallyExcludedEntries);
        const processedItems = processInventoryItems(filterRawData(sheetResult.data), excludedCodes, processingDate);
        return calculateProcessedInventoryData(processedItems, sheetResult.sheetName, processingDate);
      });
      
      newAnnualTrendData.sort((a, b) => {
        const dateA = getProcessingDateFromSheetName(a.sheetName);
        const dateB = getProcessingDateFromSheetName(b.sheetName);
        return dateA.getTime() - dateB.getTime();
      });
      setAnnualTrendData(newAnnualTrendData);

      if (newAnnualTrendData.length > 0) {
        currDataForComparison = newAnnualTrendData[newAnnualTrendData.length - 1]; 
      }
    }
    setProcessedCurrentDataForComparison(currDataForComparison);

    if (previousMonthUploadResult) { 
      const processingDate = getProcessingDateFromSheetName(previousMonthUploadResult.sheetName);
      const excludedCodes = getExcludedCodesSet(previousMonthUploadResult.manuallyExcludedEntries);
      const processedItems = processInventoryItems(filterRawData(previousMonthUploadResult.data), excludedCodes, processingDate);
      prevDataForComparison = calculateProcessedInventoryData(processedItems, previousMonthUploadResult.sheetName, processingDate);
    } else if (newAnnualTrendData.length >= 2) { 
      prevDataForComparison = newAnnualTrendData[newAnnualTrendData.length - 2]; 
    }
    setProcessedPreviousDataForComparison(prevDataForComparison);
    
    setMonthlySummary(generateMonthlyComparison(currDataForComparison, prevDataForComparison));
    
    return { 
      currentComparisonData: currDataForComparison,
      previousComparisonData: prevDataForComparison
    };

  }, [previousMonthUploadResult, currentMonthUploadResult, channelFilter]);


  const [manuallyExcludedForDisplay, setManuallyExcludedForDisplay] = useState<ManuallyExcludedRawEntry[] | null>(null);

  const handleStartAnalysis = async () => {
    if (!currentMonthUploadResult && !previousMonthUploadResult) {
      toast({ title: "데이터 없음", description: "분석할 데이터가 없습니다. 먼저 파일을 업로드해주세요.", variant: "destructive" });
      return;
    }
    
    setAnalysisLoading(true);
    setAnalysisTriggered(true);
    setManuallyExcludedForDisplay(null); 

    try {
      const { currentComparisonData, previousComparisonData } = processAllDataInternal(); 

      
      if (currentComparisonData && currentMonthUploadResult) {
          const currentSheetResult = currentMonthUploadResult.find(sr => sr.sheetName === currentComparisonData.sheetName);
          if (currentSheetResult) {
              setManuallyExcludedForDisplay(currentSheetResult.manuallyExcludedEntries);
          }
      }

      const riskComparisonResult = compareRiskStatus(currentComparisonData, previousComparisonData);
      setRiskStatusChanges(riskComparisonResult);
      
      toast({ title: "데이터 분석 완료", description: "재고 분석이 완료되었습니다."});

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("분석 오류:", errorMessage);
      toast({ title: "분석 오류", description: errorMessage, variant: "destructive" });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const _generatePdfObject = async (): Promise<jsPDF | null> => {
    if (!analysisTriggered) {
        toast({ title: "분석 필요", description: "PDF를 생성하려면 먼저 데이터 분석을 실행해주세요.", variant: "destructive" });
        return null;
    }

    const sectionsToInclude: { ref: React.RefObject<HTMLElement>, isTabbed?: boolean, forceRiskFilter?: boolean }[] = [];
    
    if (summaryCardsSectionRef.current) { sectionsToInclude.push({ ref: summaryCardsSectionRef }); }
    if (trendGraphSectionRef.current) { sectionsToInclude.push({ ref: trendGraphSectionRef, isTabbed: false }); }
    if (customizableExpirationSectionRef.current) { sectionsToInclude.push({ ref: customizableExpirationSectionRef }); }
    if (riskAnalysisSectionRef.current) { sectionsToInclude.push({ ref: riskAnalysisSectionRef, forceRiskFilter: true }); }
    if (manualExclusionSectionRef.current) { sectionsToInclude.push({ ref: manualExclusionSectionRef }); }
    if (riskStatusChangeSectionRef.current) { sectionsToInclude.push({ ref: riskStatusChangeSectionRef }); }
    
    if (sectionsToInclude.length === 0) {
        toast({ title: "내보낼 데이터 없음", description: "PDF로 내보낼 수 있는 분석 결과가 없습니다.", variant: "destructive" });
        return null;
    }
    
    const pdfDoc = await generatePdf(sectionsToInclude);
    if (!pdfDoc) {
        throw new Error("PDF 객체 생성에 실패했습니다.");
    }
    return pdfDoc;
  };
  
  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
        const pdf = await _generatePdfObject();
        if (pdf) {
            pdf.save("재고_분석_보고서.pdf");
            toast({ title: "PDF 생성 완료", description: "보고서 PDF 파일이 다운로드됩니다." });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("PDF 생성 오류:", error);
        toast({ title: "PDF 생성 실패", description: `PDF 생성 중 오류 발생: ${errorMessage}`, variant: "destructive" });
    } finally {
        setPdfLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!analysisTriggered) {
      toast({ title: "분석 필요", description: "엑셀 파일을 생성하려면 먼저 데이터 분석을 실행해주세요.", variant: "destructive" });
      return;
    }
    if (!processedCurrentDataForComparison && !processedPreviousDataForComparison && (!annualTrendData || annualTrendData.length === 0)) {
      toast({ title: "데이터 부족", description: "엑셀 파일로 내보낼 분석 데이터가 충분하지 않습니다.", variant: "destructive" });
      return;
    }

    setExcelLoading(true);

    const setSheetColumnWidths = (worksheet: XLSX.WorkSheet, jsonData: any[]) => {
      if (!jsonData || jsonData.length === 0) {
        return;
      }

      const columnKeys = Object.keys(jsonData[0]);
      const colWidths = columnKeys.map((key) => {
        let maxLength = String(key).length; 
        jsonData.forEach(row => {
          const cellValue = row[key];
          if (cellValue != null) {
            const cellLength = String(cellValue).length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        });
        return { wch: maxLength + 2 }; 
      });
      worksheet['!cols'] = colWidths;
    };


    try {
      const wb = XLSX.utils.book_new();

      if (monthlySummary) {
        const summarySheetData = [
          { 항목: "이번달 총 재고 금액", 값: monthlySummary.current.totalInventoryValue, 비고: `시트: ${monthlySummary.current.sheetName || 'N/A'}` },
          { 항목: "이전달 총 재고 금액", 값: monthlySummary.previous.totalInventoryValue, 비고: `시트: ${monthlySummary.previous.sheetName || 'N/A'}` },
          { 항목: "이번달 악성 위험 재고 품목 수", 값: monthlySummary.current.atRiskItemsCount, 비고: `시트: ${monthlySummary.current.sheetName || 'N/A'}` },
          { 항목: "이전달 악성 위험 재고 품목 수", 값: monthlySummary.previous.atRiskItemsCount, 비고: `시트: ${monthlySummary.previous.sheetName || 'N/A'}` },
          { 항목: "이번달 악성 위험 재고 금액", 값: monthlySummary.current.atRiskInventoryValue, 비고: `시트: ${monthlySummary.current.sheetName || 'N/A'}` },
          { 항목: "이전달 악성 위험 재고 금액", 값: monthlySummary.previous.atRiskInventoryValue, 비고: `시트: ${monthlySummary.previous.sheetName || 'N/A'}` },
          { 항목: "악성 위험 재고 증감 금액", 값: monthlySummary.atRiskValueChange, 비고: "이번달 – 이전달" },
          { 항목: "악성 위험 재고 증감률 (%)", 값: monthlySummary.atRiskValueChangePercentage === Infinity ? 'N/A (이전달 0)' : monthlySummary.atRiskValueChangePercentage, 비고: "(증감금액 ÷ 이전달 금액) × 100" },
        ];
        const summaryWS = XLSX.utils.json_to_sheet(summarySheetData);
        setSheetColumnWidths(summaryWS, summarySheetData);
        XLSX.utils.book_append_sheet(wb, summaryWS, "월별 비교 요약");
      }
      
      const inventoryItemToSheetRow = (item: InventoryItem) => ({
        '품목코드': item.품목코드,
        '품목이름': item.품목이름,
        '카테고리': item.category,
        '시판/방판': item['시판/방판'],
        '총수량': item.총수량,
        '만기일(최소)': format(item.expiryDate, 'yyyy-MM-dd'),
        '남은개월수': item.remainingMonths,
        '구매단가': item.구매단가,
        '총재고금액': item.totalValue,
        '월평균 판매수량': item['월평균 판매수량'],
        '예상소진개월수': item.estimatedDepletionMonths === 9999 ? 'N/A (판매량 0)' : Math.round(item.estimatedDepletionMonths),
        '악성 위험 재고': item.isAtRisk ? '예' : '아니오',
        '수동제외': item.isManuallyExcluded ? '예' : '아니오',
        '창고명': item.창고명,
        '최초만기일수량': item.earliestExpiryBatchQuantity
      });

      if (processedCurrentDataForComparison && processedCurrentDataForComparison.items.length > 0) {
        const currentAllItemsSheetData = processedCurrentDataForComparison.items.map(inventoryItemToSheetRow);
        const currentAllItemsWS = XLSX.utils.json_to_sheet(currentAllItemsSheetData);
        setSheetColumnWidths(currentAllItemsWS, currentAllItemsSheetData);
        XLSX.utils.book_append_sheet(wb, currentAllItemsWS, `이번달 전체 (${processedCurrentDataForComparison.sheetName || 'N/A'})`);
      }
      
      if (processedCurrentDataForComparison) {
        const processingDate = getProcessingDateFromSheetName(processedCurrentDataForComparison.sheetName);
        const expiring3Months = filterItemsExpiringSoon(processedCurrentDataForComparison.items, 3, processingDate);
        const food3M = expiring3Months.filter(item => item.category === 'food').map(inventoryItemToSheetRow);
        const cosmetics3M = expiring3Months.filter(item => item.category === 'cosmetics').map(inventoryItemToSheetRow);
        if (food3M.length > 0) {
          const ws = XLSX.utils.json_to_sheet(food3M);
          setSheetColumnWidths(ws, food3M);
          XLSX.utils.book_append_sheet(wb, ws, "3개월만기_식품");
        }
        if (cosmetics3M.length > 0) {
          const ws = XLSX.utils.json_to_sheet(cosmetics3M);
          setSheetColumnWidths(ws, cosmetics3M);
          XLSX.utils.book_append_sheet(wb, ws, "3개월만기_화장품");
        }
      }
      
      if (processedCurrentDataForComparison) {
        const processingDate = getProcessingDateFromSheetName(processedCurrentDataForComparison.sheetName);
        const expiring8Months = filterItemsExpiringSoon(processedCurrentDataForComparison.items, 8, processingDate);
        const food8M = expiring8Months.filter(item => item.category === 'food').map(inventoryItemToSheetRow);
        const cosmetics8M = expiring8Months.filter(item => item.category === 'cosmetics').map(inventoryItemToSheetRow);
        if (food8M.length > 0) {
          const ws = XLSX.utils.json_to_sheet(food8M);
          setSheetColumnWidths(ws, food8M);
          XLSX.utils.book_append_sheet(wb, ws, "8개월만기_식품");
        }
        if (cosmetics8M.length > 0) {
          const ws = XLSX.utils.json_to_sheet(cosmetics8M);
          setSheetColumnWidths(ws, cosmetics8M);
          XLSX.utils.book_append_sheet(wb, ws, "8개월만기_화장품");
        }
      }

      if (processedCurrentDataForComparison) {
        const atRiskItemsSheetData = processedCurrentDataForComparison.items.filter(item => item.isAtRisk).map(inventoryItemToSheetRow);
        if (atRiskItemsSheetData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(atRiskItemsSheetData);
          setSheetColumnWidths(ws, atRiskItemsSheetData);
          XLSX.utils.book_append_sheet(wb, ws, "악성 위험 재고품목");
        }
      }

      if (manuallyExcludedForDisplay && manuallyExcludedForDisplay.length > 0) {
        const exclusionSheetData = manuallyExcludedForDisplay.map(entry => ({
          '제외된 품목코드': entry['품목코드'],
          '제외된 품목이름': entry['품목이름'],
          '채널': entry['채널'],
        }));
        const exclusionWS = XLSX.utils.json_to_sheet(exclusionSheetData);
        setSheetColumnWidths(exclusionWS, exclusionSheetData);
        XLSX.utils.book_append_sheet(wb, exclusionWS, "수동 제외 품목");
      }
      
      if (annualTrendData && annualTrendData.length > 0) {
        annualTrendData.forEach(monthlyData => {
          if (monthlyData.items.length > 0) {
            const sheetName = `연간_${monthlyData.sheetName || '데이터'}`.substring(0,30); 
            const annualSheetData = monthlyData.items.map(inventoryItemToSheetRow);
            const annualWS = XLSX.utils.json_to_sheet(annualSheetData);
            setSheetColumnWidths(annualWS, annualSheetData);
            XLSX.utils.book_append_sheet(wb, annualWS, sheetName);
          }
        });
      }

      if (wb.SheetNames.length === 0) {
        toast({ title: "데이터 없음", description: "엑셀 파일로 내보낼 데이터가 없습니다.", variant: "destructive" });
      } else {
        XLSX.writeFile(wb, "재고_분석_보고서.xlsx");
        toast({ title: "엑셀 생성 완료", description: "재고 분석 보고서 엑셀 파일이 다운로드됩니다." });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Excel 생성 오류:", error);
      toast({ title: "엑셀 생성 실패", description: `엑셀 파일 생성 중 오류 발생: ${errorMessage}`, variant: "destructive" });
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDownloadHtml = async () => {
    if (!analysisTriggered) {
      toast({ title: "분석 필요", description: "HTML 파일을 생성하려면 먼저 데이터 분석을 실행해주세요.", variant: "destructive" });
      return;
    }
    setHtmlLoading(true);
    try {
      const reportElementRefs = [
        summaryCardsSectionRef,
        trendGraphSectionRef,
        customizableExpirationSectionRef,
        riskAnalysisSectionRef,
        manualExclusionSectionRef,
        riskStatusChangeSectionRef,
      ];

      let headContent = document.head.innerHTML;
      headContent = headContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');


      let reportHtmlContent = "";
      reportElementRefs.forEach(ref => {
        if (ref.current) {
          const clonedElement = ref.current.cloneNode(true) as HTMLElement;

          const tabPanels = clonedElement.querySelectorAll<HTMLElement>('[role="tabpanel"]');
          tabPanels.forEach(panel => {
            panel.style.setProperty('display', 'block', 'important');
          });

          const elementsToExpand = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>(
            'div[style*="max-height"], div[class*="max-h-"], div[style*="overflow"], div[class*="overflow-auto"], div[class*="overflow-y-auto"], div[style*="height"]'
          ))];
          
          elementsToExpand.forEach(el => {
            el.style.setProperty('max-height', 'none', 'important');
            el.style.setProperty('overflow', 'visible', 'important');
            if (el.style.height && el.style.height !== 'auto' && el.scrollHeight > el.clientHeight) {
                 el.style.setProperty('height', 'auto', 'important');
            }
          });
          
          reportHtmlContent += clonedElement.outerHTML;
        }
      });
      
      const finalCssOverrides = `
            body { margin: 20px !important; font-family: Arial, Helvetica, sans-serif !important; background-color: white !important; color: #333 !important; }
            .sticky-header thead th { position: static !important; background-color: #f0f0f0 !important; }
            [role="tabpanel"] { display: block !important; } 
            [role="tablist"] { display: none !important; }

            button, input[type="file"], #header-buttons-portal-target, 
            div[class*="FileUploadSection__FileUploadArea"], 
            [id^="previousMonthFile"], [id^="currentMonthFile"], 
            .md\\:grid-cols-2.gap-6 > div[role="button"], 
            [aria-labelledby="radix-"], 
            [data-radix-collection-item], 
            section[aria-labelledby] > button, 
            .lucide-upload-cloud + label + input + p
             { display: none !important; }
            .card { margin-bottom: 20px !important; border: 1px solid #ddd !important; box-shadow: none !important; }
            h1, h2, h3, h4, h5, h6 { color: #333 !important; }
            main.container { padding: 0 !important; } 
            div[data-html-export-hide="true"] { display: none !important; }
            
            div[style*="max-height"], div[class*="max-h-"],
            div[style*="overflow"], div[class*="overflow-auto"], div[class*="overflow-y-auto"] {
                max-height: none !important;
                overflow: visible !important;
                height: auto !important;
            }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
      `;

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>재고 분석 보고서</title>
          ${headContent}
          <style>${finalCssOverrides}</style>
        </head>
        <body>
          <div style="padding: 20px; max-width: 1200px; margin: auto;">
            <h1 style="text-align: center; margin-bottom: 30px; font-size: 24px; color: #333;">재고 분석 보고서</h1>
            ${reportHtmlContent}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = '재고_분석_보고서.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: "HTML 생성 완료", description: "보고서 HTML 파일이 다운로드됩니다." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("HTML 생성 오류:", error);
      toast({ title: "HTML 생성 실패", description: `HTML 생성 중 오류 발생: ${errorMessage}`, variant: "destructive" });
    } finally {
      setHtmlLoading(false);
    }
  };


  const hasFilesUploaded = currentMonthUploadResult || previousMonthUploadResult;
  const showResults = analysisTriggered && !analysisLoading;
  const anyDownloadInProgress = pdfLoading || excelLoading || htmlLoading;


  return (
    <div className="space-y-8 py-6">
      {portalNode && ReactDOM.createPortal(
        <>
          <Button onClick={handleDownloadPdf} disabled={anyDownloadInProgress || !analysisTriggered} size="default">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            PDF 다운로드
          </Button>
          <Button onClick={handleDownloadExcel} variant="default" disabled={anyDownloadInProgress || !analysisTriggered} size="default"> 
            {excelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            엑셀 다운로드
          </Button>
          <Button onClick={handleDownloadHtml} variant="default" disabled={anyDownloadInProgress || !analysisTriggered} size="default">
            {htmlLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCode className="h-4 w-4 mr-2" />}
            HTML 다운로드
          </Button>
        </>,
        portalNode
      )}
      <div ref={reportContentRef}>
        <div ref={fileUploadSectionRef} data-html-export-hide="true">
          <FileUploadSection 
            onFileUpload={handleFileUpload} 
            loading={fileUploadLoading}
            previousFileStatus={prevFileStatus}
            currentFileStatus={currFileStatus}
          />
        </div>
        <div ref={requiredColumnsInfoRef} data-html-export-hide="true">
          <RequiredColumnsInfo />
        </div>

        {hasFilesUploaded && !analysisTriggered && (
          <div ref={analysisTriggerCardRef} data-html-export-hide="true">
            <Card className="text-center py-6 bg-card rounded-lg shadow">
                <CardContent className="pt-6">
                    <p className="text-lg font-semibold text-foreground mb-4">파일이 업로드되었습니다.</p>
                    <Button onClick={handleStartAnalysis} disabled={analysisLoading || fileUploadLoading} size="lg"> 
                    {analysisLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <PlayCircle className="h-5 w-5 mr-2" />} 
                    데이터 분석 시작
                    </Button>
                </CardContent>
            </Card>
          </div>
        )}
        
        {(fileUploadLoading || analysisLoading ) && ( 
          <div ref={loadingStateRef} data-html-export-hide="true" className="flex items-center justify-center p-8 text-primary">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span className="text-lg">
              {fileUploadLoading ? "파일 업로드 중..." : analysisLoading ? "데이터 분석 중..." : "처리 중..."} 
            </span>
          </div>
        )}
        
        {!fileUploadLoading && !analysisLoading && !hasFilesUploaded && !analysisTriggered && ( 
          <div ref={noDataStateRef} data-html-export-hide="true" className="text-center py-10 bg-card rounded-lg shadow">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground">데이터가 없습니다.</p>
            <p className="text-muted-foreground">분석을 시작하려면 엑셀 파일을 업로드해주세요.</p>
          </div>
        )}

        {showResults && (
          <div ref={summaryCardsSectionRef}>
            <SummaryCardsSection 
              summary={monthlySummary}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
              analysisTriggered={analysisTriggered}
             />
          </div>
        )}
        
        {showResults && (
           <div ref={trendGraphSectionRef}>
             <TrendGraphsSection 
                summary={monthlySummary} 
                annualData={annualTrendData} 
             /> 
           </div>
        )}
            
        {showResults && processedCurrentDataForComparison && (
          <>
            <div ref={customizableExpirationSectionRef}>
              <CustomizableExpirationSection processedData={processedCurrentDataForComparison} />
            </div>
            <div ref={riskAnalysisSectionRef}>
              <RiskAnalysisSection processedData={processedCurrentDataForComparison} />
            </div>
          </>
        )}

        {showResults && (
          <div ref={manualExclusionSectionRef}>
            <ManualExclusionSection excludedEntries={manuallyExcludedForDisplay} channelFilter={channelFilter} />
          </div>
        )}
        
        {showResults && (
          <div ref={riskStatusChangeSectionRef}>
            <RiskStatusChangeSection comparisonResult={riskStatusChanges} />
          </div>
        )}

        {!analysisLoading && analysisTriggered && !(processedCurrentDataForComparison || processedPreviousDataForComparison || (annualTrendData && annualTrendData.length > 0)) && !fileUploadLoading && ( 
          <div ref={noResultsStateRef} data-html-export-hide="true" className="text-center py-10 bg-card rounded-lg shadow">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground">분석 결과 없음</p>
              <p className="text-muted-foreground">데이터 처리 후 표시할 내용이 없거나, 유효한 데이터가 없어 분석이 불가합니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
    

    

    

    
