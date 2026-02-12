# Plan: 캠페인 데이터 로딩 최적화

## 개요

| 항목 | 내용 |
|------|------|
| 기능명 | campaign-data-loading |
| 작성일 | 2026-02-12 |
| 상태 | Draft |

## 문제 정의

### 현재 상황

1. **API 응답과 프론트엔드 불일치**
   - `/api/accounts/{accountId}/campaigns` API는 이미 `metrics` 데이터를 포함해서 반환
   - 프론트엔드(`page.tsx`)는 API 응답의 `metrics`를 무시하고 별도로 각 캠페인별 `/metrics` API를 호출
   - 불필요한 N+1 API 호출 발생 (캠페인 10개 = 11번의 API 호출)

2. **누락된 데이터**
   - 캠페인별 소재(Creative) 수가 표시되지 않음
   - 광고그룹 수는 API가 반환하지만 프론트엔드에서 `_count.adGroups`로 접근 (API는 `adGroupCount`로 반환)

3. **데이터 계층 구조**
   ```
   Account
   └── Campaign
       └── AdGroup
           └── Ad
               └── Creative
   ```
   - 캠페인별 소재 수를 계산하려면 이 계층을 통한 집계 필요

### 기대 결과

1. **단일 API 호출로 모든 데이터 로드**
   - 캠페인 목록 + 메트릭 + 광고그룹 수 + 소재 수를 한 번에 가져오기

2. **캠페인 카드에 표시할 데이터**
   - 캠페인 이름, 상태, 목표, 예산
   - 7일간 지출, 전환, ROAS
   - 광고그룹 수
   - 소재 수 (신규)

## 해결 방안

### 1. API 수정 (campaigns/route.ts)

**변경 사항:**
- 각 캠페인의 소재 수를 집계하여 반환
- Campaign → AdGroup → Ad → Creative 관계를 통해 카운트

**수정 코드:**
```typescript
// 캠페인별 소재 수 집계
const creativeCounts = await prisma.creative.groupBy({
  by: ['ads'],
  where: {
    ads: {
      some: {
        adGroup: {
          campaignId: { in: campaigns.map(c => c.id) }
        }
      }
    }
  },
  _count: true
});

// 또는 raw query로 처리
const creativeCounts = await prisma.$queryRaw`
  SELECT ag."campaignId", COUNT(DISTINCT c.id) as "creativeCount"
  FROM "Creative" c
  JOIN "_AdToCreative" ac ON c.id = ac."B"
  JOIN "Ad" a ON a.id = ac."A"
  JOIN "AdGroup" ag ON a."adGroupId" = ag.id
  WHERE ag."campaignId" IN (${Prisma.join(campaigns.map(c => c.id))})
  GROUP BY ag."campaignId"
`;
```

### 2. 프론트엔드 수정 (page.tsx)

**변경 사항:**
1. API 응답의 `metrics` 직접 사용 (별도 메트릭 API 호출 제거)
2. `adGroupCount` 필드명 사용
3. `creativeCount` 필드 추가 표시

**수정 전:**
```typescript
interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  _count?: {
    adGroups: number;
  };
}

// 별도 메트릭 API 호출
const fetchCampaignMetrics = async (campaignList: Campaign[]) => { ... };
```

**수정 후:**
```typescript
interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  adGroupCount: number;
  creativeCount: number;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
}

// 메트릭 API 호출 제거, API 응답 직접 사용
```

## 구현 범위

### 포함

- [ ] `/api/accounts/{accountId}/campaigns` API 수정 - 소재 수 집계 추가
- [ ] 캠페인 목록 페이지 수정 - API 응답 직접 사용
- [ ] 캠페인 카드 UI 수정 - 소재 수 표시 추가

### 제외

- 캠페인 상세 페이지 (별도 기능)
- 실시간 메트릭 업데이트
- 소재 썸네일 미리보기

## 영향 분석

### 변경 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/app/api/accounts/[accountId]/campaigns/route.ts` | 수정 | 소재 수 집계 로직 추가 |
| `src/app/(dashboard)/accounts/[accountId]/page.tsx` | 수정 | API 응답 직접 사용, UI 업데이트 |

### 의존성

- Prisma ORM (기존)
- PostgreSQL (기존)

## 위험 요소

| 위험 | 영향도 | 대응 방안 |
|------|--------|----------|
| 소재 수 집계 쿼리 성능 | 중 | 인덱스 확인, 필요시 캐싱 |
| 다대다 관계(Ad-Creative) 집계 복잡성 | 중 | Raw SQL 또는 서브쿼리 활용 |

## 성공 기준

1. 캠페인 목록 페이지 로드 시 API 호출 횟수: N+1 → 1회
2. 캠페인 카드에 지출, 전환, ROAS, 광고그룹 수, 소재 수 모두 표시
3. 데이터 로딩 시간 50% 이상 단축

## 다음 단계

1. `/pdca design campaign-data-loading` - 상세 설계
2. 구현
3. 테스트 및 검증
