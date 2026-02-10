'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Report {
  id: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  title: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  period: {
    start: string;
    end: string;
  };
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: Report[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

const typeLabels = {
  DAILY: '일간',
  WEEKLY: '주간',
  MONTHLY: '월간',
  CUSTOM: '맞춤',
};

const statusConfig = {
  PENDING: {
    label: '대기 중',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
  },
  GENERATING: {
    label: '생성 중',
    color: 'bg-blue-100 text-blue-800',
    icon: Loader2,
  },
  COMPLETED: {
    label: '완료',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  FAILED: {
    label: '실패',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

export default function ReportsPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (typeFilter !== 'all') queryParams.set('type', typeFilter);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);

      const res = await fetch(
        `/api/reports/${accountId}?${queryParams.toString()}`
      );
      const data: ReportsResponse = await res.json();

      if (data.success) {
        setReports(data.data.reports);
      } else {
        setError('리포트 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('리포트 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Create new report
  const handleCreateReport = async (type: string) => {
    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`/api/reports/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchReports();
      } else {
        setError('리포트 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('리포트 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/reports/${accountId}/${reportId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        await fetchReports();
      } else {
        setError('리포트 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('리포트 삭제에 실패했습니다.');
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date range
  const formatPeriod = (start: string, end: string): string => {
    const startDate = new Date(start).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
    const endDate = new Date(end).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
    return `${startDate} - ${endDate}`;
  };

  useEffect(() => {
    fetchReports();
  }, [accountId, typeFilter, statusFilter]);

  // Auto-refresh for generating reports
  useEffect(() => {
    const hasGenerating = reports.some((r) => r.status === 'GENERATING');
    if (hasGenerating) {
      const interval = setInterval(fetchReports, 5000);
      return () => clearInterval(interval);
    }
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리포트</h1>
          <p className="text-muted-foreground">
            성과 리포트를 생성하고 관리하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            새로고침
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quick Create Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            리포트 생성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleCreateReport('DAILY')}
              disabled={creating}
            >
              <Calendar className="h-4 w-4 mr-2" />
              일간 리포트
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateReport('WEEKLY')}
              disabled={creating}
            >
              <Calendar className="h-4 w-4 mr-2" />
              주간 리포트
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateReport('MONTHLY')}
              disabled={creating}
            >
              <Calendar className="h-4 w-4 mr-2" />
              월간 리포트
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="DAILY">일간</SelectItem>
            <SelectItem value="WEEKLY">주간</SelectItem>
            <SelectItem value="MONTHLY">월간</SelectItem>
            <SelectItem value="CUSTOM">맞춤</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="PENDING">대기 중</SelectItem>
            <SelectItem value="GENERATING">생성 중</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="FAILED">실패</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              리포트가 없습니다
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              위의 버튼을 눌러 새 리포트를 생성해보세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const status = statusConfig[report.status];
            const StatusIcon = status.icon;

            return (
              <Card key={report.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.title}</span>
                        <Badge variant="outline">
                          {typeLabels[report.type]}
                        </Badge>
                        <Badge className={status.color}>
                          <StatusIcon
                            className={`h-3 w-3 mr-1 ${
                              report.status === 'GENERATING' ? 'animate-spin' : ''
                            }`}
                          />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatPeriod(report.period.start, report.period.end)}</span>
                        {report.fileSize && (
                          <span>{formatFileSize(report.fileSize)}</span>
                        )}
                        <span>
                          {new Date(report.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === 'COMPLETED' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open PDF download page
                            window.open(`/api/reports/${accountId}/${report.id}/download?format=html`, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF 다운로드
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Open report viewer
                            window.open(`/api/reports/${accountId}/${report.id}`, '_blank');
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          미리보기
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
