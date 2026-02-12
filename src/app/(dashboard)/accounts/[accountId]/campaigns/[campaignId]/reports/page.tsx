'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, ChevronRight, Loader2 } from 'lucide-react';

export default function CampaignReportsPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [campaignName, setCampaignName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 캠페인 정보 조회
  useEffect(() => {
    const fetchCampaignInfo = async () => {
      try {
        const response = await fetch(`/api/accounts/${accountId}/campaigns/${campaignId}`);
        const data = await response.json();
        if (data.success && data.data?.campaign) {
          setCampaignName(data.data.campaign.name);
        }
      } catch (err) {
        console.error('Failed to fetch campaign info:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaignInfo();
  }, [accountId, campaignId]);

  const handleGenerateReport = () => {
    // TODO: 리포트 생성 기능 구현
    alert('리포트 생성 기능은 추후 구현 예정입니다.');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}`} className="hover:text-foreground">
          캠페인 목록
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaignName || '...'}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">리포트</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리포트</h1>
          <p className="text-muted-foreground">캠페인 성과 리포트를 생성하고 다운로드합니다</p>
        </div>
        <Button onClick={handleGenerateReport}>
          <FileText className="h-4 w-4 mr-2" />
          리포트 생성
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Report Types */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleGenerateReport}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">일간 리포트</CardTitle>
                  <CardDescription>일별 성과 요약</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleGenerateReport}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">주간 리포트</CardTitle>
                  <CardDescription>주별 성과 분석</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handleGenerateReport}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">월간 리포트</CardTitle>
                  <CardDescription>월별 종합 분석</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">생성된 리포트가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              상단의 리포트 유형을 선택하거나 &quot;리포트 생성&quot; 버튼을 클릭하여 새 리포트를 만드세요
            </p>
            <Button variant="outline" onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              첫 리포트 생성하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
