# 기획서: 캠페인 중심 구조 재편성

## 기능명
campaign-centric-structure

## 개요
현재 계정 중심 대시보드에서 캠페인 중심 구조로 전환하여, 사용자가 캠페인 단위로 성과를 분석하고 관리할 수 있도록 UX를 개선합니다.

---

## TikTok Ads 계층 구조 (베이스)

```
Account (계정)
   └── Campaign (캠페인)
          └── AdGroup (광고그룹)
                 └── Ad (광고)
                        └── Creative (소재)
```

### 데이터베이스 스키마 관계
- `Account` → 1:N → `Campaign`
- `Campaign` → 1:N → `AdGroup`
- `AdGroup` → 1:N → `Ad`
- `Ad` → N:1 → `Creative`
- `PerformanceMetric`는 모든 레벨(ACCOUNT, CAMPAIGN, ADGROUP, AD, CREATIVE)에서 측정
- `AIInsight`, `AIStrategy`는 Account, Campaign, Creative 레벨에서 생성 가능

---

## 현재 상태 분석

### 현재 구조
```
/accounts                           → 계정 목록 (지출/ROAS/CPA 메트릭 포함)
/accounts/[accountId]               → 계정 대시보드 (KPI, 차트, 인사이트)
/accounts/[accountId]/creatives     → 계정 소재 분석
/accounts/[accountId]/insights      → 계정 AI 인사이트
/accounts/[accountId]/strategies    → 계정 AI 전략
/accounts/[accountId]/reports       → 계정 리포트
/accounts/[accountId]/campaigns/[campaignId]           → 캠페인 대시보드
/accounts/[accountId]/campaigns/[campaignId]/insights  → 캠페인 인사이트
/accounts/[accountId]/campaigns/[campaignId]/strategies → 캠페인 전략
```

### 문제점
1. 계정 목록에서 불필요한 메트릭(지출/ROAS/CPA) 표시 - 계정은 선택 용도
2. 계정 선택 시 바로 대시보드로 이동 → 캠페인 목록 확인 어려움
3. 캠페인별 소재 분석 페이지 부재 (소재는 Campaign > AdGroup > Ad > Creative 계층)
4. 계정 구분을 위한 메모/별칭 기능 없음
5. 광고그룹(AdGroup) 레벨 페이지 부재

---

## 요구사항

### 1. 계정 목록 페이지 (`/accounts`) 간소화

#### 제거할 항목
- 지출(Spend) 컬럼
- ROAS 컬럼
- CPA 컬럼
- Summary Cards (총 지출, 평균 ROAS 등)
- 메트릭 기반 정렬 옵션 (spend_desc, roas_desc 등)

#### 유지할 항목
- 계정 이름
- 클라이언트 이름 / 업종
- 상태 (ACTIVE/PAUSED)
- 캠페인 수
- 인사이트 수 (읽지 않은 것)
- 검색 및 필터링 기능

#### 추가할 항목
- **메모/별칭 기능**: 계정별 사용자 지정 메모 또는 별칭 추가/수정
  - 인라인 편집 또는 모달을 통한 수정
  - DB 저장 (Account 테이블에 nickname, memo 필드 추가)

#### UI 변경
- 카드 레이아웃 → 심플한 리스트 또는 테이블 형태
- 클릭 시 `/accounts/[accountId]` (캠페인 목록)으로 이동

---

### 2. 계정 상세 페이지 (`/accounts/[accountId]`) → 캠페인 목록

#### 현재
- KPI 그리드, 차트, AI 인사이트/전략 요약 표시
- SetupGuide 포함

#### 변경 후
- **캠페인 목록**을 메인으로 표시
- 각 캠페인 카드/행에 표시:
  - 캠페인 이름
  - 상태 (ACTIVE/PAUSED/DELETED)
  - 목표 (TRAFFIC/CONVERSION 등)
  - 예산 정보 (일일/총 예산)
  - 주요 메트릭 (지출, 전환, ROAS)
  - 광고그룹(AdGroup) 수
- 페이지네이션 또는 무한 스크롤
- 캠페인 검색/필터링

---

### 3. 캠페인 대시보드 (`/accounts/[accountId]/campaigns/[campaignId]`)

#### 캠페인 선택 시 표시할 메뉴 (5개 탭/페이지)

| # | 메뉴 | 경로 | 설명 |
|---|------|------|------|
| 1 | 개요 | `/campaigns/[campaignId]` | KPI, 차트, 요약 |
| 2 | 소재 분석 | `/campaigns/[campaignId]/creatives` | 캠페인 하위 소재 성과 |
| 3 | AI 인사이트 | `/campaigns/[campaignId]/insights` | 캠페인 인사이트 |
| 4 | AI 전략 | `/campaigns/[campaignId]/strategies` | 캠페인 전략 |
| 5 | 리포트 | `/campaigns/[campaignId]/reports` | 캠페인 리포트 |

#### 3.1 개요 (현재 구현됨)
- KPI 그리드: 지출, 노출, 클릭, 전환, CTR, CVR, CPA, ROAS
- 성과 추이 차트
- AI 인사이트/전략 요약 카드
- 광고그룹 목록 (간략)

#### 3.2 소재 분석 (신규)
캠페인 하위의 모든 소재를 분석 (Campaign > AdGroup > Ad > Creative)
- 해당 캠페인의 소재 목록 (Ad를 통해 연결된 Creative들)
- 소재별 성과 지표 (spend, impressions, clicks, conversions, CTR, CVR, CPA, ROAS)
- 소재 피로도 분석 (CreativeFatigue)
- 등급 분포

#### 3.3 AI 인사이트 (현재 구현됨)
- 캠페인 레벨 인사이트 (`AIInsight.campaignId = campaignId`)
- 이상 징후 알림

#### 3.4 AI 전략 (현재 구현됨)
- 캠페인 레벨 전략 제안 (`AIStrategy.campaignId = campaignId`)

#### 3.5 리포트 (신규)
- 캠페인별 성과 리포트 생성/다운로드

---

## 새로운 라우트 구조

```
/accounts                                              → 계정 목록 (간소화)
/accounts/[accountId]                                  → 캠페인 목록 ⭐ 변경
/accounts/[accountId]/campaigns/[campaignId]           → 캠페인 개요
/accounts/[accountId]/campaigns/[campaignId]/creatives → 캠페인 소재 분석 ⭐ 신규
/accounts/[accountId]/campaigns/[campaignId]/insights  → 캠페인 AI 인사이트
/accounts/[accountId]/campaigns/[campaignId]/strategies→ 캠페인 AI 전략
/accounts/[accountId]/campaigns/[campaignId]/reports   → 캠페인 리포트 ⭐ 신규
```

### 계정 레벨 페이지 (유지)
- `/accounts/[accountId]/insights` → 계정 전체 인사이트
- `/accounts/[accountId]/strategies` → 계정 전체 전략

### 제거할 페이지
- `/accounts/[accountId]/creatives` → 캠페인 레벨로 이동
- `/accounts/[accountId]/reports` → 캠페인 레벨로 이동

---

## 사이드바 네비게이션 변경

### 계정 선택 전
```
- 광고 계정 (목록)
- 알림
- 설정
```

### 계정 선택 후 (캠페인 미선택)
```
- ← 계정 목록
- [계정명] (또는 별칭)
  - 캠페인 목록 (메인)
  - 전체 인사이트
  - 전체 전략
```

### 캠페인 선택 후
```
- ← [계정명]
- [캠페인명]
  - 개요
  - 소재 분석
  - AI 인사이트
  - AI 전략
  - 리포트
```

---

## 데이터 스키마 변경

### Account 테이블 추가 필드
```prisma
model Account {
  // 기존 필드...
  nickname    String?   // 사용자 지정 별칭
  memo        String?   // 계정 메모
}
```

### 캠페인 소재 조회 쿼리 (계층 구조 기반)
```sql
-- Campaign > AdGroup > Ad > Creative 계층을 통해 소재 조회
SELECT DISTINCT c.*
FROM Creative c
JOIN Ad a ON a.creativeId = c.id
JOIN AdGroup ag ON a.adGroupId = ag.id
WHERE ag.campaignId = :campaignId
```

### API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| PATCH | `/api/accounts/[id]` | 계정 별칭/메모 수정 |
| GET | `/api/accounts/[id]/campaigns/[campaignId]/creatives` | 캠페인 소재 목록 (신규) |

---

## 구현 우선순위

### Phase 1: 기본 구조 변경
1. 계정 목록 페이지 간소화 (메트릭 제거)
2. 계정 상세 페이지 → 캠페인 목록으로 변경
3. 사이드바 네비게이션 업데이트

### Phase 2: 캠페인 레벨 페이지
4. 캠페인 소재 분석 페이지 생성 (Campaign > AdGroup > Ad > Creative 계층 쿼리)
5. 캠페인 리포트 페이지 생성
6. 기존 캠페인 인사이트/전략 페이지 검증

### Phase 3: 부가 기능
7. 계정 별칭/메모 기능 추가 (스키마 변경, API, UI)
8. 불필요한 계정 레벨 페이지 제거

---

## 화면 흐름

```
[계정 목록] - 간소화된 리스트
    ↓ 계정 선택
[캠페인 목록] - 해당 계정의 모든 캠페인 (with 메트릭)
    ↓ 캠페인 선택
[캠페인 대시보드]
    ├── 개요 (KPI, 차트, 광고그룹 요약)
    ├── 소재 분석 (Campaign > AdGroup > Ad > Creative)
    ├── AI 인사이트
    ├── AI 전략
    └── 리포트
```

---

## 예상 파일 변경

| 파일 | 작업 |
|------|------|
| `src/app/(dashboard)/accounts/page.tsx` | 메트릭 제거, UI 간소화 |
| `src/app/(dashboard)/accounts/[accountId]/page.tsx` | 캠페인 목록으로 변경 |
| `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/creatives/page.tsx` | 신규 생성 |
| `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/reports/page.tsx` | 신규 생성 |
| `src/components/layout/sidebar.tsx` | 네비게이션 구조 변경 |
| `prisma/schema.prisma` | Account에 nickname, memo 추가 |
| `src/app/api/accounts/[accountId]/route.ts` | PATCH 메서드 추가 |
| `src/app/api/accounts/[accountId]/campaigns/[campaignId]/creatives/route.ts` | 신규 생성 |

---

## 완료 기준

- [ ] 계정 목록에서 메트릭(지출/ROAS/CPA) 제거됨
- [ ] 계정 선택 시 캠페인 목록이 표시됨
- [ ] 캠페인 선택 시 5개 메뉴(개요/소재/인사이트/전략/리포트) 접근 가능
- [ ] 캠페인 소재 분석이 계층 구조(Campaign > AdGroup > Ad > Creative) 기반으로 동작
- [ ] 사이드바가 현재 컨텍스트(계정/캠페인)에 맞게 변경됨
- [ ] 계정 별칭/메모 추가 및 수정 가능

---

## 참고: 계층별 데이터 범위

| 레벨 | 데이터 범위 | 예시 |
|------|------------|------|
| Account | 해당 계정의 모든 데이터 | 전체 지출, 전체 인사이트 |
| Campaign | 해당 캠페인 하위의 모든 데이터 | 캠페인 지출, 캠페인 소재들 |
| AdGroup | 해당 광고그룹 하위의 광고/소재 | (향후 확장 가능) |
| Ad | 해당 광고의 소재 | (향후 확장 가능) |
| Creative | 개별 소재 | 소재 피로도, 성과 |

현재 구현 범위는 **Account → Campaign → Creative** 레벨까지 (AdGroup/Ad는 중간 계층으로 데이터 조회에만 사용)
