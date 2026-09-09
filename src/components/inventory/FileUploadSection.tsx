
"use client";

import React, { useState, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';

interface FileUploadSectionProps {
  onFileUpload: (file: File, type: 'previous' | 'current') => void;
  loading: boolean;
  previousFileStatus: string | null;
  currentFileStatus: string | null;
}

interface FileUploadAreaProps {
  id: string;
  label: string;
  onFileSelect: (file: File) => void;
  disabled: boolean;
  status: string | null;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ id, label, onFileSelect, disabled, status }) => {
  const [dragging, setDragging] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = ''; 
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        onFileSelect(file);
      } else {
        // Consider using toast for invalid file type
        console.warn("Invalid file type dropped: " + file.name);
      }
    }
    event.dataTransfer.clearData();
  };
  
  const handleClick = () => {
    document.getElementById(id)?.click();
  }

  return (
    <div
      className={`space-y-2 p-6 border-2 rounded-lg transition-colors duration-200 ease-in-out text-center 
        ${disabled ? 'border-muted bg-muted/30 cursor-not-allowed' // Disabled state
          : dragging ? 'border-primary bg-primary/5' // Dragging state
          : 'bg-card hover:bg-muted/30 border-dashed border-input text-foreground cursor-pointer' // Default active state (white background)
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={disabled ? undefined : handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
    >
      <UploadCloud className={`h-8 w-8 mx-auto mb-2 ${
        disabled ? 'text-muted-foreground' 
        : dragging ? 'text-primary' 
        : 'text-primary' // Icon color for default state
      }`} />
      <Label htmlFor={id} className={`text-base font-medium ${
        disabled ? 'text-muted-foreground cursor-not-allowed' 
        : dragging ? 'text-foreground'
        : 'text-foreground cursor-pointer' // Label color for default state
      }`}>
        {label}
      </Label>
      <Input
        id={id}
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
      />
      <p className={`text-xs mt-1 ${
        disabled ? 'text-muted-foreground'
        : dragging ? 'text-muted-foreground'
        : 'text-muted-foreground' // Placeholder text color for default state
      }`}>
        {dragging ? "여기에 파일을 놓으세요" : "파일을 끌어다 놓거나 클릭하여 선택하세요."}
      </p>
      {status && <p className={`text-xs mt-2 ${status.includes('오류') || status.includes('실패') ? 'text-destructive' : (disabled || dragging ? 'text-muted-foreground' : 'text-muted-foreground')}`}>{status}</p>}
    </div>
  );
};

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onFileUpload,
  loading,
  previousFileStatus,
  currentFileStatus
}) => {
  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline">데이터 업로드</CardTitle>
        <CardDescription>이전달과 이번달의 재고 현황 엑셀 파일을 업로드해주세요. 파일을 끌어다 놓거나 클릭하여 업로드 할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <FileUploadArea
          id="previousMonthFile"
          label="전월 기준 재고 데이터"
          onFileSelect={(file) => onFileUpload(file, 'previous')}
          disabled={loading}
          status={previousFileStatus}
        />
        <FileUploadArea
          id="currentMonthFile"
          label="금월 기준 재고 데이터"
          onFileSelect={(file) => onFileUpload(file, 'current')}
          disabled={loading}
          status={currentFileStatus}
        />
      </CardContent>
    </Card>
  );
};

export default FileUploadSection;
