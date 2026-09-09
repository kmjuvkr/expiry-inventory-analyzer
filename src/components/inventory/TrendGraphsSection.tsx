
"use client";

import type { MonthlyComparisonSummary, ProcessedInventoryData } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LabelList, LineChart, Line } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const name = payload[0].name;
    return (
      <div className="bg-background/80 backdrop-blur-sm p-3 border border-border rounded-md shadow-lg text-sm">
        <p className="label text-foreground font-semibold mb-1">{`${label}`}</p>
        <p style={{ color: payload[0].fill }}>
          {`${name}: ${value.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })}`}
        </p>
      </div>
    );
  }
  return null;
};

const DonutChartCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/80 backdrop-blur-sm p-3 border border-border rounded-md shadow-lg">
        <p className="label text-foreground font-semibold">{`${data.name}`}</p>
        <p className="intro text-sm" style={{ color: data.fill }}>
          {`금액: ${data.value.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' })} (${(payload[0].percent * 100).toFixed(1)}%)`}
        </p>
      </div>
    );
  }
  return null;
};

const yAxisFormatter = (value: number) => {
  if (value === 0) return '0';
  return (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const barLabelFormatter = (value: number) => {
  if (value === 0) return '';
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '백만';
  }
  if (Math.abs(value) >= 1000) {
     return (value / 1000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '천';
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const RADIAN = Math.PI / 180;
const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload, fill }: any) => {
  if (percent < 0.05 && payload.value > 0) {
    return null;
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  let textColor = 'hsl(var(--primary-foreground))';
  if (fill === 'hsl(var(--chart-2))' || fill.toLowerCase().includes('yellow') || fill.toLowerCase().includes('orange') || fill === 'hsl(var(--accent))') {
     textColor = 'hsl(var(--accent-foreground))';
  }

  return (
    <text
      x={x}
      y={y}
      fill={textColor}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="11px"
      fontWeight="600"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const LineChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-3 border border-border rounded-md shadow-lg text-sm">
        <p className="label text-foreground font-semibold mb-1">{`${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} style={{ color: pld.stroke }}>
            {`${pld.name}: ${pld.value.toLocaleString('ko-KR')} 백만원`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


interface TrendGraphsSectionProps {
  summary?: MonthlyComparisonSummary | null;
  annualData?: ProcessedInventoryData[] | null;
}

const TrendGraphsSection: React.FC<TrendGraphsSectionProps> = ({ summary, annualData }) => {
  const navyColor = 'hsl(var(--chart-1))';
  const yellowColor = 'hsl(var(--chart-2))';
  
  const legendUnitFormatter = (value: string) => `${value} (단위: 백만원)`;
  const pieLegendFormatter = (value: string) => value;


  const totalInventoryData = summary ? [
    { name: summary.previous.sheetName || "이전달", "총 재고 금액": summary.previous.totalInventoryValue, fill: navyColor },
    { name: summary.current.sheetName || "이번달", "총 재고 금액": summary.current.totalInventoryValue, fill: navyColor },
  ] : [];

  const atRiskInventoryData = summary ? [
    { name: summary.previous.sheetName || "이전달", "악성 위험 재고 금액": summary.previous.atRiskInventoryValue, fill: yellowColor },
    { name: summary.current.sheetName || "이번달", "악성 위험 재고 금액": summary.current.atRiskInventoryValue, fill: yellowColor },
  ] : [];

  const currentTotalValue = summary?.current.totalInventoryValue || 0;
  const currentAtRiskValue = summary?.current.atRiskInventoryValue || 0;
  const currentNormalValue = Math.max(0, currentTotalValue - currentAtRiskValue);

  const donutChartData = summary ? [
    { name: '악성 위험 재고 금액', value: currentAtRiskValue, fill: yellowColor },
    { name: '정상 재고 금액', value: currentNormalValue, fill: navyColor },
  ].filter(item => item.value > 0 || (currentTotalValue === 0 && item.value === 0)) : [];

   const annualChartDataInternal = annualData
    ? annualData.map(d => ({
        month: d.sheetName || 'N/A',
        totalValue: d.totalInventoryValue / 1000000, 
        atRiskValue: d.atRiskInventoryValue / 1000000, 
      }))
    : [];

  const showMonthly = !!summary;
  const showAnnual = !!annualData && annualData.length > 0;

  return (
    <>
      {showMonthly && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">월별 비교</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2 mb-2 text-center">
                  <h3 className="text-lg font-semibold text-foreground">총 재고 금액 변화</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={totalInventoryData} margin={{ top: 20, right: 5, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <YAxis
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                      tickFormatter={yAxisFormatter}
                      domain={[0, 'dataMax + dataMax * 0.1']}
                      label={{ value: "(백만원)", position: 'insideLeft', angle: -90, dy: -10, fontSize:10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
                      formatter={legendUnitFormatter}
                    />
                    <Bar dataKey="총 재고 금액" radius={[4, 4, 0, 0]}>
                      {totalInventoryData.map((entry, index) => (
                        <Cell key={`cell-total-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="총 재고 금액"
                        position="top"
                        formatter={barLabelFormatter}
                        style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                        offset={8}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2 mb-2 text-center">
                  <h3 className="text-lg font-semibold text-foreground">재고 구성</h3>
                  <span className="text-xs text-muted-foreground">(이번달)</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                {donutChartData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      paddingAngle={donutChartData.length > 1 ? 2 : 0}
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell key={`cell-donut-${index}`} fill={entry.fill} stroke={entry.value > 0 ? "hsl(var(--border))" : "none"} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutChartCustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      formatter={pieLegendFormatter}
                    />
                  </PieChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      데이터 없음 (이번달)
                    </div>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col items-center">
                 <div className="flex items-baseline gap-2 mb-2 text-center">
                  <h3 className="text-lg font-semibold text-foreground">악성 위험 재고 금액 변화</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={atRiskInventoryData} margin={{ top: 20, right: 5, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <YAxis
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                      tickFormatter={yAxisFormatter}
                      domain={[0, 'dataMax + dataMax * 0.1']}
                      label={{ value: "(백만원)", position: 'insideLeft', angle: -90, dy: -10, fontSize:10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
                      formatter={legendUnitFormatter}
                    />
                    <Bar dataKey="악성 위험 재고 금액" radius={[4, 4, 0, 0]}>
                      {atRiskInventoryData.map((entry, index) => (
                          <Cell key={`cell-atrisk-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="악성 위험 재고 금액"
                          position="top"
                          formatter={barLabelFormatter}
                          style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                          offset={8}
                        />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showAnnual && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">연간 추이</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-10">
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-2 mb-4 text-center">
                     <h3 className="text-lg font-semibold text-foreground">연간 총 재고 금액 추이</h3>
                     <span className="text-xs text-muted-foreground">(단위: 백만원)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={annualChartDataInternal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--foreground))" tick={{ fontSize: 12 }} />
                      <YAxis 
                          stroke="hsl(var(--foreground))" 
                          tick={{ fontSize: 12 }} 
                          domain={['auto', 'auto']} 
                          tickFormatter={(value) => value.toLocaleString(undefined, {maximumFractionDigits: 1})} 
                          label={{ value: "(백만원)", position: 'insideLeft', angle: -90, dy: -10, fontSize:10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip content={<LineChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="totalValue" name="총 재고 금액" stroke={navyColor} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
                         <LabelList dataKey="totalValue" position="top" formatter={(value: number) => value.toFixed(1)} style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} offset={5} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-2 mb-4 text-center">
                      <h3 className="text-lg font-semibold text-foreground">연간 악성 위험 재고 금액 추이</h3>
                      <span className="text-xs text-muted-foreground">(단위: 백만원)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={annualChartDataInternal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--foreground))" tick={{ fontSize: 12 }} />
                      <YAxis 
                          stroke="hsl(var(--foreground))" 
                          tick={{ fontSize: 12 }} 
                          domain={['auto', 'auto']} 
                          tickFormatter={(value) => value.toLocaleString(undefined, {maximumFractionDigits: 1})}
                          label={{ value: "(백만원)", position: 'insideLeft', angle: -90, dy: -10, fontSize:10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip content={<LineChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="atRiskValue" name="악성 위험 재고 금액" stroke={yellowColor} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
                         <LabelList dataKey="atRiskValue" position="top" formatter={(value: number) => value.toFixed(1)} style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} offset={5} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-6 text-center">
                참고: 연간 재고 현황 그래프는 "이번달 기준 재고 데이터"로 업로드된 엑셀 파일의 각 시트명을 기준으로 표시됩니다. 시트명은 연대순으로 정렬됩니다.
              </p>
            </>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TrendGraphsSection;
