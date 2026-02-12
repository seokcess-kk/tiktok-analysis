# Design: 인사이트-전략 자동 연결

**Feature**: insight-strategy-linking
**Created**: 2026-02-12
**Status**: ✅ Completed (PDCA 완료)

---

## 1. 기존 인프라 분석

### 1.1 이미 구현된 항목

| 항목 | 상태 | 위치 |
|------|------|------|
| DB 관계 모델 | ✅ | `AIStrategy.insightId` → `AIInsight.id` |
| 전략 생성 API | ✅ | `POST /api/ai/strategies/{accountId}/generate` (insightId 수용) |
| InsightDetailSheet UI | ✅ | `src/components/insights/insight-detail-sheet.tsx` (버튼 있음) |

### 1.2 추가 구현 필요 항목

| 항목 | 상태 | 위치 |
|------|------|------|
| 계정 인사이트 페이지 핸들러 | ❌→✅ | `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx` |
| 캠페인 인사이트 페이지 핸들러 | ❌→✅ | `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/insights/page.tsx` |

---

## 2. 구현 명세

### 2.1 수정 대상 파일

| 파일 | 수정 내용 |
|------|-----------|
| `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx` | 전략 전환 버튼 및 핸들러 추가 |
| `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/insights/page.tsx` | 전략 전환 버튼 및 핸들러 추가 |

### 2.2 추가할 Import

```tsx
import { Button } from '@/components/ui/button';
import { Target, Loader2 } from 'lucide-react';
import Link from 'next/link';
```

### 2.3 추가할 State

```tsx
const [converting, setConverting] = useState(false);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

### 2.4 추가할 Handler

```tsx
const handleConvertToStrategy = async (insightId: string) => {
  setConverting(true);
  setSuccessMessage(null);
  try {
    const response = await fetch(`/api/ai/strategies/${accountId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate strategy');
    }

    const result = await response.json();
    const strategyCount = result.data?.strategies?.length || 1;

    setSuccessMessage(`${strategyCount}개의 전략이 생성되었습니다.`);

    // Update linked strategies count
    setInsights((prev) =>
      prev.map((i) =>
        i.id === insightId
          ? { ...i, linkedStrategiesCount: (i.linkedStrategiesCount || 0) + strategyCount }
          : i
      )
    );
  } catch (err) {
    setError('전략 생성에 실패했습니다.');
  } finally {
    setConverting(false);
  }
};
```

### 2.5 추가할 UI 컴포넌트

#### Success Message 배너

```tsx
{successMessage && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 flex items-center justify-between">
    <span>{successMessage}</span>
    <Link href={`/accounts/${accountId}/strategies`} className="text-green-600 hover:text-green-700 font-medium underline">
      전략 페이지로 이동
    </Link>
  </div>
)}
```

#### 선택된 인사이트 패널에 버튼 추가

```tsx
{selectedInsightData && (
  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
    <h3 className="text-sm font-semibold text-gray-900">선택된 인사이트</h3>
    <InsightCard {...selectedInsightData} compact={false} />
    <div className="pt-3 border-t flex gap-2">
      <Button onClick={() => handleConvertToStrategy(selectedInsightData.id)} disabled={converting} className="flex-1">
        {converting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
        {converting ? '생성 중...' : '전략으로 전환'}
      </Button>
      {selectedInsightData.linkedStrategiesCount > 0 && (
        <Link href={`/accounts/${accountId}/strategies`}>
          <Button variant="outline">연결된 전략 ({selectedInsightData.linkedStrategiesCount})</Button>
        </Link>
      )}
    </div>
  </div>
)}
```

---

## 3. 데이터 흐름

```
인사이트 페이지
    │
    └── 인사이트 선택 → "전략으로 전환" 버튼 클릭
            │
            ↓
    POST /api/ai/strategies/{accountId}/generate
    Body: { insightId: "insight-id" }
            │
            ↓
    OpenAI/Fallback → 전략 생성
            │
            ↓
    AIStrategy 저장 (insightId 자동 연결)
            │
            ↓
    UI 업데이트:
    - successMessage 표시
    - linkedStrategiesCount 증가
    - 전략 페이지 링크 제공
```

---

## 4. 구현 체크리스트

### 4.1 캠페인 인사이트 페이지

| ID | 항목 | 우선순위 |
|----|------|----------|
| CAMP-01 | Target, Loader2 아이콘 import | High |
| CAMP-02 | converting, successMessage state 추가 | High |
| CAMP-03 | handleConvertToStrategy 함수 추가 | High |
| CAMP-04 | Success message 배너 추가 | High |
| CAMP-05 | 선택된 인사이트 패널에 버튼 추가 | High |
| CAMP-06 | 연결된 전략 링크 버튼 | Medium |

### 4.2 계정 인사이트 페이지

| ID | 항목 | 우선순위 |
|----|------|----------|
| ACC-01 | Target, Loader2, Button import | High |
| ACC-02 | converting, successMessage state 추가 | High |
| ACC-03 | handleConvertToStrategy 함수 추가 | High |
| ACC-04 | Success message 배너 추가 | High |
| ACC-05 | 선택된 인사이트 패널에 버튼 추가 | High |
| ACC-06 | 연결된 전략 링크 버튼 | Medium |

---

## 5. 성공 기준

- [ ] 인사이트 선택 시 "전략으로 전환" 버튼 표시
- [ ] 버튼 클릭 시 전략 생성 API 호출 (insightId 포함)
- [ ] 생성 중 로딩 상태 표시
- [ ] 생성 완료 후 성공 메시지 표시
- [ ] 전략 페이지 링크 제공
- [ ] 연결된 전략 개수 업데이트
- [ ] 빌드 및 타입 체크 통과

---

*Created by bkit PDCA design phase*
