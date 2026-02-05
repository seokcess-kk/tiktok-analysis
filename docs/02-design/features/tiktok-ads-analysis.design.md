# TikTok 광고 성과 분석 시스템 - Design Document

> **Feature**: tiktok-ads-analysis
> **Created**: 2026-02-05
> **Status**: Draft
> **Plan Reference**: [tiktok-ads-analysis.plan.md](../../01-plan/features/tiktok-ads-analysis.plan.md)

---

## 1. 설계 개요

### 1.1 설계 목표
- AI 중심 아키텍처로 인사이트/전략 생성을 핵심에 배치
- 소재 분석 데이터 파이프라인 최적화
- 확장 가능한 모듈러 구조
- 실시간 + 배치 처리 하이브리드 아키텍처

### 1.2 설계 원칙
1. **AI-First**: 모든 기능은 AI 엔진을 통해 가치 생성
2. **Data-Driven**: 데이터 수집 → 분석 → 인사이트 → 액션 파이프라인
3. **Modularity**: 각 모듈 독립적 개발/배포 가능
4. **Scalability**: 계정 수 증가에 따른 수평 확장

---

## 2. 데이터베이스 설계

### 2.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     User        │       │    Account      │       │    Client       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email           │  │    │ clientId (FK)   │◄─┼────│ name            │
│ name            │  │    │ tiktokAdvId     │  │    │ industry        │
│ role            │  │    │ name            │  │    │ createdAt       │
│ createdAt       │  │    │ accessToken     │  │    └─────────────────┘
└─────────────────┘  │    │ refreshToken    │  │
         │           │    │ tokenExpiresAt  │  │
         │           │    │ status          │  │
         │           │    │ createdAt       │  │
         │           │    └─────────────────┘  │
         │           │             │           │
         │           │             ▼           │
         │           │    ┌─────────────────┐  │
         │           │    │    Campaign     │  │
         │           │    ├─────────────────┤  │
         │           │    │ id (PK)         │  │
         │           │    │ accountId (FK)  │◄─┘
         │           │    │ tiktokCampaignId│
         │           │    │ name            │
         │           │    │ objective       │
         │           │    │ budget          │
         │           │    │ status          │
         │           │    └─────────────────┘
         │           │             │
         │           │             ▼
         │           │    ┌─────────────────┐
         │           │    │    AdGroup      │
         │           │    ├─────────────────┤
         │           │    │ id (PK)         │
         │           │    │ campaignId (FK) │
         │           │    │ tiktokAdGroupId │
         │           │    │ name            │
         │           │    │ targeting       │ (JSON)
         │           │    │ bidStrategy     │
         │           │    │ status          │
         │           │    └─────────────────┘
         │           │             │
         │           │             ▼
         │           │    ┌─────────────────┐      ┌─────────────────┐
         │           │    │       Ad        │      │    Creative     │
         │           │    ├─────────────────┤      ├─────────────────┤
         │           │    │ id (PK)         │──────│ id (PK)         │
         │           │    │ adGroupId (FK)  │      │ adId (FK)       │
         │           │    │ creativeId (FK) │      │ tiktokCreativeId│
         │           │    │ tiktokAdId      │      │ type            │ (VIDEO/IMAGE/CAROUSEL)
         │           │    │ name            │      │ thumbnailUrl    │
         │           │    │ status          │      │ videoUrl        │
         │           │    └─────────────────┘      │ duration        │
         │           │                             │ tags            │ (JSON)
         │           │                             │ hookScore       │
         │           │                             │ createdAt       │
         │           │                             └─────────────────┘
         │           │
         │           │    ┌─────────────────────────────────────────┐
         │           │    │           PerformanceMetric             │
         │           │    ├─────────────────────────────────────────┤
         │           │    │ id (PK)                                 │
         │           │    │ accountId (FK)                          │
         │           │    │ campaignId (FK) nullable                │
         │           │    │ adGroupId (FK) nullable                 │
         │           │    │ adId (FK) nullable                      │
         │           │    │ creativeId (FK) nullable                │
         │           │    │ date                                    │
         │           │    │ level (ACCOUNT/CAMPAIGN/ADGROUP/AD/CREATIVE)│
         │           │    │ spend                                   │
         │           │    │ impressions                             │
         │           │    │ clicks                                  │
         │           │    │ conversions                             │
         │           │    │ ctr                                     │
         │           │    │ cvr                                     │
         │           │    │ cpc                                     │
         │           │    │ cpm                                     │
         │           │    │ cpa                                     │
         │           │    │ roas                                    │
         │           │    │ videoViews                              │
         │           │    │ videoWatched2s                          │
         │           │    │ videoWatched6s                          │
         │           │    │ avgVideoPlayTime                        │
         │           │    │ createdAt                               │
         │           │    └─────────────────────────────────────────┘
         │           │
         │           │    ┌─────────────────────────────────────────┐
         │           │    │           CreativeFatigue               │
         │           │    ├─────────────────────────────────────────┤
         │           │    │ id (PK)                                 │
         │           │    │ creativeId (FK)                         │
         │           │    │ date                                    │
         │           │    │ fatigueIndex (0-100)                    │
         │           │    │ peakPerformanceDate                     │
         │           │    │ daysActive                              │
         │           │    │ performanceTrend (RISING/STABLE/DECLINING)│
         │           │    │ recommendedAction                       │
         │           │    │ createdAt                               │
         │           │    └─────────────────────────────────────────┘
         │           │
         ▼           ▼    ┌─────────────────────────────────────────┐
┌─────────────────┐       │             AIInsight                   │
│  UserAccount    │       ├─────────────────────────────────────────┤
├─────────────────┤       │ id (PK)                                 │
│ userId (FK)     │       │ accountId (FK)                          │
│ accountId (FK)  │       │ type (DAILY/ANOMALY/TREND/CREATIVE)     │
│ role (ADMIN/    │       │ severity (INFO/WARNING/CRITICAL)        │
│      VIEWER)    │       │ title                                   │
└─────────────────┘       │ summary                                 │
                          │ details (JSON)                          │
                          │ metrics (JSON)                          │
                          │ generatedAt                             │
                          │ expiresAt                               │
                          │ isRead                                  │
                          └─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           AIStrategy                    │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ accountId (FK)                          │
│ insightId (FK) nullable                 │
│ type (BUDGET/CAMPAIGN/TARGETING/CREATIVE)│
│ priority (HIGH/MEDIUM/LOW)              │
│ title                                   │
│ description                             │
│ actionItems (JSON)                      │
│ expectedImpact (JSON)                   │
│ difficulty (EASY/MEDIUM/HARD)           │
│ status (PENDING/ACCEPTED/REJECTED/DONE) │
│ acceptedAt                              │
│ completedAt                             │
│ actualResult (JSON)                     │
│ createdAt                               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Report                        │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ accountId (FK)                          │
│ type (DAILY/WEEKLY/MONTHLY/CUSTOM)      │
│ periodStart                             │
│ periodEnd                               │
│ fileUrl                                 │
│ insights (JSON)                         │
│ strategies (JSON)                       │
│ generatedAt                             │
│ sentVia (JSON) [SLACK/KAKAO/EMAIL]      │
│ sentAt                                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Notification                  │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ userId (FK)                             │
│ accountId (FK) nullable                 │
│ type (INSIGHT/STRATEGY/ANOMALY/REPORT)  │
│ title                                   │
│ message                                 │
│ link                                    │
│ isRead                                  │
│ createdAt                               │
└─────────────────────────────────────────┘
```

### 2.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// User & Auth
// ─────────────────────────────────────────

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  passwordHash  String?
  role          UserRole       @default(MEMBER)
  accounts      UserAccount[]
  notifications Notification[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

enum UserRole {
  ADMIN
  MEMBER
}

model UserAccount {
  userId    String
  accountId String
  role      AccountRole @default(VIEWER)
  user      User        @relation(fields: [userId], references: [id])
  account   Account     @relation(fields: [accountId], references: [id])
  createdAt DateTime    @default(now())

  @@id([userId, accountId])
}

enum AccountRole {
  ADMIN
  EDITOR
  VIEWER
}

// ─────────────────────────────────────────
// Client & Account
// ─────────────────────────────────────────

model Client {
  id        String    @id @default(cuid())
  name      String
  industry  String?
  accounts  Account[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Account {
  id              String    @id @default(cuid())
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id])
  tiktokAdvId     String    @unique
  name            String
  accessToken     String
  refreshToken    String
  tokenExpiresAt  DateTime
  status          AccountStatus @default(ACTIVE)

  users           UserAccount[]
  campaigns       Campaign[]
  metrics         PerformanceMetric[]
  insights        AIInsight[]
  strategies      AIStrategy[]
  reports         Report[]
  notifications   Notification[]

  lastSyncAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum AccountStatus {
  ACTIVE
  PAUSED
  DISCONNECTED
}

// ─────────────────────────────────────────
// Campaign Structure
// ─────────────────────────────────────────

model Campaign {
  id               String    @id @default(cuid())
  accountId        String
  account          Account   @relation(fields: [accountId], references: [id])
  tiktokCampaignId String
  name             String
  objective        String
  budget           Float
  budgetMode       String    // DAILY, LIFETIME
  status           String
  adGroups         AdGroup[]
  metrics          PerformanceMetric[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([accountId, tiktokCampaignId])
}

model AdGroup {
  id              String    @id @default(cuid())
  campaignId      String
  campaign        Campaign  @relation(fields: [campaignId], references: [id])
  tiktokAdGroupId String
  name            String
  targeting       Json      // 타겟팅 설정 전체
  bidStrategy     String
  bidAmount       Float?
  status          String
  ads             Ad[]
  metrics         PerformanceMetric[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([campaignId, tiktokAdGroupId])
}

model Ad {
  id          String    @id @default(cuid())
  adGroupId   String
  adGroup     AdGroup   @relation(fields: [adGroupId], references: [id])
  tiktokAdId  String
  creativeId  String?
  creative    Creative? @relation(fields: [creativeId], references: [id])
  name        String
  status      String
  metrics     PerformanceMetric[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([adGroupId, tiktokAdId])
}

// ─────────────────────────────────────────
// Creative (소재)
// ─────────────────────────────────────────

model Creative {
  id               String    @id @default(cuid())
  tiktokCreativeId String    @unique
  type             CreativeType
  thumbnailUrl     String?
  videoUrl         String?
  imageUrl         String?
  duration         Int?      // 영상 길이 (초)

  // AI 분석 태그
  tags             Json?     // ["인물", "제품", "텍스트오버레이"]
  hookScore        Float?    // 첫 3초 효과 점수 (0-100)

  ads              Ad[]
  metrics          PerformanceMetric[]
  fatigue          CreativeFatigue[]

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum CreativeType {
  VIDEO
  IMAGE
  CAROUSEL
}

model CreativeFatigue {
  id                  String    @id @default(cuid())
  creativeId          String
  creative            Creative  @relation(fields: [creativeId], references: [id])
  date                DateTime  @db.Date
  fatigueIndex        Float     // 0-100 (높을수록 피로도 높음)
  peakPerformanceDate DateTime?
  daysActive          Int
  performanceTrend    PerformanceTrend
  recommendedAction   String?
  createdAt           DateTime  @default(now())

  @@unique([creativeId, date])
}

enum PerformanceTrend {
  RISING
  STABLE
  DECLINING
  EXHAUSTED
}

// ─────────────────────────────────────────
// Performance Metrics (성과 데이터)
// ─────────────────────────────────────────

model PerformanceMetric {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id])
  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])
  adGroupId   String?
  adGroup     AdGroup?  @relation(fields: [adGroupId], references: [id])
  adId        String?
  ad          Ad?       @relation(fields: [adId], references: [id])
  creativeId  String?
  creative    Creative? @relation(fields: [creativeId], references: [id])

  date        DateTime  @db.Date
  level       MetricLevel

  // 기본 메트릭
  spend       Float     @default(0)
  impressions Int       @default(0)
  clicks      Int       @default(0)
  conversions Int       @default(0)

  // 계산 메트릭
  ctr         Float?    // Click Through Rate
  cvr         Float?    // Conversion Rate
  cpc         Float?    // Cost Per Click
  cpm         Float?    // Cost Per Mille
  cpa         Float?    // Cost Per Acquisition
  roas        Float?    // Return On Ad Spend

  // 영상 메트릭
  videoViews       Int?
  videoWatched2s   Int?
  videoWatched6s   Int?
  avgVideoPlayTime Float?

  createdAt   DateTime  @default(now())

  @@unique([accountId, date, level, campaignId, adGroupId, adId, creativeId])
  @@index([accountId, date])
  @@index([creativeId, date])
}

enum MetricLevel {
  ACCOUNT
  CAMPAIGN
  ADGROUP
  AD
  CREATIVE
}

// ─────────────────────────────────────────
// AI Insights & Strategies
// ─────────────────────────────────────────

model AIInsight {
  id          String        @id @default(cuid())
  accountId   String
  account     Account       @relation(fields: [accountId], references: [id])
  type        InsightType
  severity    Severity
  title       String
  summary     String        @db.Text
  details     Json          // 상세 분석 데이터
  metrics     Json?         // 관련 메트릭 스냅샷
  strategies  AIStrategy[]

  generatedAt DateTime      @default(now())
  expiresAt   DateTime?
  isRead      Boolean       @default(false)
  readAt      DateTime?

  @@index([accountId, generatedAt])
  @@index([accountId, type])
}

enum InsightType {
  DAILY_SUMMARY    // 일간 요약
  ANOMALY          // 이상 탐지
  TREND            // 트렌드 분석
  CREATIVE         // 소재 분석
  PREDICTION       // 예측
}

enum Severity {
  INFO
  WARNING
  CRITICAL
}

model AIStrategy {
  id              String         @id @default(cuid())
  accountId       String
  account         Account        @relation(fields: [accountId], references: [id])
  insightId       String?
  insight         AIInsight?     @relation(fields: [insightId], references: [id])

  type            StrategyType
  priority        Priority
  title           String
  description     String         @db.Text

  // 액션 아이템
  actionItems     Json           // [{action, target, value, reason}]
  expectedImpact  Json           // {metric, change, confidence}
  difficulty      Difficulty

  // 상태 추적
  status          StrategyStatus @default(PENDING)
  acceptedAt      DateTime?
  completedAt     DateTime?
  rejectedReason  String?
  actualResult    Json?          // 실행 후 실제 결과

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([accountId, status])
  @@index([accountId, createdAt])
}

enum StrategyType {
  BUDGET          // 예산 최적화
  CAMPAIGN        // 캠페인 운영
  TARGETING       // 타겟팅 최적화
  CREATIVE        // 소재 전략
  BIDDING         // 입찰 전략
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum StrategyStatus {
  PENDING
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  REJECTED
  EXPIRED
}

// ─────────────────────────────────────────
// Reports & Notifications
// ─────────────────────────────────────────

model Report {
  id          String       @id @default(cuid())
  accountId   String
  account     Account      @relation(fields: [accountId], references: [id])
  type        ReportType
  periodStart DateTime     @db.Date
  periodEnd   DateTime     @db.Date
  fileUrl     String?
  insights    Json?        // 포함된 인사이트 요약
  strategies  Json?        // 포함된 전략 요약
  generatedAt DateTime     @default(now())
  sentVia     Json?        // ["SLACK", "KAKAO"]
  sentAt      DateTime?
}

enum ReportType {
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  accountId String?
  account   Account?         @relation(fields: [accountId], references: [id])
  type      NotificationType
  title     String
  message   String
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
}

enum NotificationType {
  INSIGHT
  STRATEGY
  ANOMALY
  REPORT
  SYSTEM
}

// ─────────────────────────────────────────
// Job Queue (배치 작업 추적)
// ─────────────────────────────────────────

model JobQueue {
  id          String    @id @default(cuid())
  type        String    // SYNC_DATA, GENERATE_INSIGHT, GENERATE_REPORT
  accountId   String?
  status      String    @default("PENDING") // PENDING, RUNNING, COMPLETED, FAILED
  payload     Json?
  result      Json?
  error       String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  @@index([type, status])
}
```

---

## 3. API 설계

### 3.1 API 구조 개요

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   └── GET    /me
│
├── /accounts
│   ├── GET    /                     # 계정 목록
│   ├── POST   /                     # 계정 추가 (OAuth)
│   ├── GET    /:id                  # 계정 상세
│   ├── PUT    /:id                  # 계정 수정
│   ├── DELETE /:id                  # 계정 삭제
│   └── POST   /:id/sync             # 수동 동기화
│
├── /campaigns
│   ├── GET    /:accountId           # 캠페인 목록
│   └── GET    /:accountId/:id       # 캠페인 상세
│
├── /creatives                        # [핵심] 소재 분석
│   ├── GET    /:accountId           # 소재 목록 + 성과
│   ├── GET    /:accountId/:id       # 소재 상세
│   ├── GET    /:accountId/top       # Top 소재
│   ├── GET    /:accountId/fatigue   # 피로도 분석
│   └── GET    /:accountId/trends    # 소재 트렌드
│
├── /metrics
│   ├── GET    /:accountId           # 성과 데이터 조회
│   ├── GET    /:accountId/summary   # 요약 통계
│   └── GET    /:accountId/compare   # 기간 비교
│
├── /ai                               # [핵심] AI 엔진
│   ├── /insights
│   │   ├── GET    /:accountId       # 인사이트 목록
│   │   ├── GET    /:accountId/:id   # 인사이트 상세
│   │   ├── POST   /:accountId/generate  # 인사이트 생성 (온디맨드)
│   │   └── PUT    /:accountId/:id/read  # 읽음 처리
│   │
│   ├── /strategies
│   │   ├── GET    /:accountId       # 전략 목록
│   │   ├── GET    /:accountId/:id   # 전략 상세
│   │   ├── POST   /:accountId/generate  # 전략 생성
│   │   ├── PUT    /:accountId/:id/accept   # 전략 수락
│   │   ├── PUT    /:accountId/:id/reject   # 전략 거절
│   │   └── PUT    /:accountId/:id/complete # 전략 완료
│   │
│   └── /analyze
│       ├── POST   /:accountId/creative   # 소재 AI 분석
│       ├── POST   /:accountId/anomaly    # 이상 탐지
│       └── POST   /:accountId/predict    # 예측 분석
│
├── /reports
│   ├── GET    /:accountId           # 리포트 목록
│   ├── POST   /:accountId/generate  # 리포트 생성
│   ├── GET    /:accountId/:id       # 리포트 상세
│   └── GET    /:accountId/:id/download  # PDF 다운로드
│
└── /notifications
    ├── GET    /                     # 알림 목록
    ├── PUT    /:id/read             # 읽음 처리
    └── PUT    /read-all             # 전체 읽음
```

### 3.2 핵심 API 상세 설계

#### 3.2.1 소재 분석 API

```typescript
// GET /api/creatives/:accountId
// 소재 목록 + 성과 데이터

interface GetCreativesRequest {
  accountId: string;
  query: {
    startDate: string;      // YYYY-MM-DD
    endDate: string;
    type?: CreativeType;    // VIDEO, IMAGE, CAROUSEL
    sortBy?: 'spend' | 'ctr' | 'cvr' | 'roas' | 'fatigueIndex';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  };
}

interface GetCreativesResponse {
  creatives: {
    id: string;
    tiktokCreativeId: string;
    type: CreativeType;
    thumbnailUrl: string;
    duration?: number;
    tags: string[];
    hookScore: number;

    // 성과 메트릭 (기간 합계)
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

    // 피로도 정보
    fatigue: {
      index: number;
      trend: PerformanceTrend;
      daysActive: number;
      recommendedAction?: string;
    };

    // 순위 정보
    ranking: {
      overall: number;      // 전체 순위
      percentile: number;   // 상위 몇 %
    };
  }[];

  pagination: {
    total: number;
    limit: number;
    offset: number;
  };

  summary: {
    totalCreatives: number;
    avgFatigueIndex: number;
    topPerformers: number;    // Top 10%
    needsAttention: number;   // 피로도 높은 소재 수
  };
}
```

```typescript
// GET /api/creatives/:accountId/fatigue
// 피로도 분석

interface GetFatigueAnalysisResponse {
  creatives: {
    id: string;
    name: string;
    thumbnailUrl: string;

    fatigueTimeline: {
      date: string;
      index: number;
      ctr: number;
      cvr: number;
    }[];

    currentFatigue: {
      index: number;
      trend: PerformanceTrend;
      peakDate: string;
      daysSincePeak: number;
      estimatedExhaustion: string;  // 예상 소진 날짜
    };

    recommendation: {
      action: 'KEEP' | 'MONITOR' | 'REPLACE' | 'URGENT_REPLACE';
      reason: string;
      suggestedReplacement?: string;  // 대체 소재 추천
    };
  }[];

  overview: {
    healthyCount: number;     // 피로도 낮음
    warningCount: number;     // 피로도 중간
    criticalCount: number;    // 피로도 높음
    avgLifespan: number;      // 평균 소재 수명 (일)
  };
}
```

#### 3.2.2 AI 인사이트 API

```typescript
// POST /api/ai/insights/:accountId/generate
// AI 인사이트 생성 (온디맨드)

interface GenerateInsightRequest {
  accountId: string;
  body: {
    type: InsightType;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    focus?: 'PERFORMANCE' | 'CREATIVE' | 'BUDGET' | 'ALL';
  };
}

interface GenerateInsightResponse {
  insight: {
    id: string;
    type: InsightType;
    severity: Severity;
    title: string;

    // 3줄 요약
    summary: string;

    // 상세 분석
    details: {
      keyFindings: {
        finding: string;
        impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
        metric: string;
        change: number;  // 변화율 %
      }[];

      rootCause?: {
        factor: string;
        contribution: number;  // 기여도 %
        evidence: string;
      }[];

      comparison?: {
        metric: string;
        current: number;
        previous: number;
        benchmark?: number;
      }[];
    };

    // 관련 메트릭
    metrics: {
      period: string;
      spend: number;
      impressions: number;
      conversions: number;
      cpa: number;
      roas: number;
      // ... 기타 메트릭
    };

    // 연결된 전략 제안
    suggestedStrategies: string[];  // strategy IDs

    generatedAt: string;
  };
}
```

#### 3.2.3 AI 전략 제안 API

```typescript
// POST /api/ai/strategies/:accountId/generate
// AI 전략 생성

interface GenerateStrategyRequest {
  accountId: string;
  body: {
    type?: StrategyType;      // 특정 타입 지정 (없으면 전체)
    insightId?: string;       // 특정 인사이트 기반
    constraints?: {
      maxBudgetChange?: number;  // 최대 예산 변경 %
      excludeCampaigns?: string[];
      targetRoas?: number;
    };
  };
}

interface GenerateStrategyResponse {
  strategies: {
    id: string;
    type: StrategyType;
    priority: Priority;
    title: string;
    description: string;

    // 구체적 액션 아이템
    actionItems: {
      action: string;           // "예산 증액", "캠페인 중단" 등
      target: string;           // 대상 (캠페인명, 소재명 등)
      targetId: string;
      currentValue?: string;
      suggestedValue: string;
      reason: string;
    }[];

    // 예상 임팩트
    expectedImpact: {
      metric: string;           // "CPA", "ROAS" 등
      currentValue: number;
      expectedValue: number;
      changePercent: number;
      confidence: number;       // 신뢰도 0-100
    };

    difficulty: Difficulty;
    estimatedEffort: string;    // "5분", "1시간" 등

    // 실행 버튼용 (가능한 경우)
    executable: boolean;
    executeEndpoint?: string;
  }[];

  summary: {
    totalStrategies: number;
    highPriority: number;
    estimatedTotalImpact: {
      metric: string;
      change: number;
    };
  };
}
```

```typescript
// PUT /api/ai/strategies/:accountId/:id/accept
// 전략 수락

interface AcceptStrategyRequest {
  accountId: string;
  strategyId: string;
  body: {
    notes?: string;
    scheduledAt?: string;  // 예약 실행
  };
}

// PUT /api/ai/strategies/:accountId/:id/complete
// 전략 완료 (실제 결과 입력)

interface CompleteStrategyRequest {
  accountId: string;
  strategyId: string;
  body: {
    actualResult: {
      metric: string;
      beforeValue: number;
      afterValue: number;
      notes?: string;
    };
  };
}
```

---

## 4. AI 엔진 설계

### 4.1 AI 모듈 구조

```
src/lib/ai/
├── index.ts                 # AI 엔진 진입점
├── client.ts                # OpenAI GPT-5.2 클라이언트
├── prompts/
│   ├── index.ts
│   ├── insight.ts           # 인사이트 생성 프롬프트
│   ├── strategy.ts          # 전략 제안 프롬프트
│   ├── creative.ts          # 소재 분석 프롬프트
│   └── anomaly.ts           # 이상 탐지 프롬프트
├── modules/
│   ├── insight-generator.ts # 인사이트 생성 모듈
│   ├── strategy-advisor.ts  # 전략 제안 모듈
│   ├── creative-analyzer.ts # 소재 분석 모듈
│   ├── anomaly-detector.ts  # 이상 탐지 모듈
│   └── prediction-engine.ts # 예측 엔진
├── schemas/
│   ├── insight.schema.ts    # 인사이트 출력 스키마
│   ├── strategy.schema.ts   # 전략 출력 스키마
│   └── creative.schema.ts   # 소재 분석 스키마
└── utils/
    ├── data-formatter.ts    # 데이터 포맷팅
    ├── cache.ts             # AI 응답 캐싱
    └── validator.ts         # 출력 검증
```

### 4.2 GPT-5.2 통합 설계

```typescript
// src/lib/ai/client.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export async function generateCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: AIRequestOptions = {}
): Promise<T> {
  const { temperature = 0.3, maxTokens = 4096 } = options;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',  // GPT-5.2 사용
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

  // Zod 스키마로 검증
  return schema.parse(parsed);
}
```

### 4.3 인사이트 생성 모듈

```typescript
// src/lib/ai/modules/insight-generator.ts

import { generateCompletion } from '../client';
import { insightPrompts } from '../prompts/insight';
import { InsightSchema, type Insight } from '../schemas/insight.schema';

interface InsightContext {
  account: {
    id: string;
    name: string;
    industry: string;
  };
  metrics: {
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    trend: MetricsTrend[];
  };
  creatives: CreativeSummary[];
  campaigns: CampaignSummary[];
}

export async function generateDailyInsight(
  context: InsightContext
): Promise<Insight> {
  const systemPrompt = insightPrompts.dailySummary.system;

  const userPrompt = insightPrompts.dailySummary.user({
    accountName: context.account.name,
    industry: context.account.industry,
    currentMetrics: formatMetrics(context.metrics.current),
    previousMetrics: formatMetrics(context.metrics.previous),
    trend: formatTrend(context.metrics.trend),
    topCreatives: context.creatives.slice(0, 5),
    campaigns: context.campaigns,
  });

  const insight = await generateCompletion(
    systemPrompt,
    userPrompt,
    InsightSchema,
    { temperature: 0.3 }
  );

  return insight;
}

export async function detectAnomalies(
  context: InsightContext
): Promise<Insight[]> {
  const systemPrompt = insightPrompts.anomalyDetection.system;

  const userPrompt = insightPrompts.anomalyDetection.user({
    metrics: context.metrics,
    thresholds: {
      cpaChange: 30,      // 30% 이상 변화 시 이상
      ctrChange: 20,
      spendVelocity: 50,
    },
  });

  const result = await generateCompletion(
    systemPrompt,
    userPrompt,
    z.array(InsightSchema),
    { temperature: 0.2 }
  );

  return result;
}
```

### 4.4 전략 제안 모듈

```typescript
// src/lib/ai/modules/strategy-advisor.ts

import { generateCompletion } from '../client';
import { strategyPrompts } from '../prompts/strategy';
import { StrategySchema, type Strategy } from '../schemas/strategy.schema';

interface StrategyContext {
  account: AccountInfo;
  insights: Insight[];
  campaigns: CampaignDetail[];
  creatives: CreativeDetail[];
  constraints: {
    maxBudgetChange?: number;
    targetRoas?: number;
    excludeCampaigns?: string[];
  };
}

export async function generateBudgetStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const systemPrompt = strategyPrompts.budgetOptimization.system;

  const userPrompt = strategyPrompts.budgetOptimization.user({
    currentBudget: calculateTotalBudget(context.campaigns),
    campaignPerformance: context.campaigns.map(c => ({
      id: c.id,
      name: c.name,
      budget: c.budget,
      spend: c.metrics.spend,
      roas: c.metrics.roas,
      cpa: c.metrics.cpa,
    })),
    constraints: context.constraints,
    insights: context.insights.filter(i => i.type === 'ANOMALY'),
  });

  const strategies = await generateCompletion(
    systemPrompt,
    userPrompt,
    z.array(StrategySchema),
    { temperature: 0.4 }
  );

  return strategies;
}

export async function generateCreativeStrategy(
  context: StrategyContext
): Promise<Strategy[]> {
  const systemPrompt = strategyPrompts.creativeOptimization.system;

  const userPrompt = strategyPrompts.creativeOptimization.user({
    creatives: context.creatives.map(c => ({
      id: c.id,
      type: c.type,
      performance: c.metrics,
      fatigue: c.fatigue,
      tags: c.tags,
    })),
    topPerformers: getTopPerformers(context.creatives),
    bottomPerformers: getBottomPerformers(context.creatives),
  });

  const strategies = await generateCompletion(
    systemPrompt,
    userPrompt,
    z.array(StrategySchema),
    { temperature: 0.5 }
  );

  return strategies;
}
```

### 4.5 프롬프트 설계

```typescript
// src/lib/ai/prompts/insight.ts

export const insightPrompts = {
  dailySummary: {
    system: `당신은 TikTok 광고 성과 분석 전문가입니다.
주어진 데이터를 분석하여 마케터가 즉시 활용할 수 있는 인사이트를 제공합니다.

분석 원칙:
1. 데이터 기반 분석만 수행 (추측 금지)
2. 변화의 원인을 논리적으로 추론
3. 실행 가능한 제안 포함
4. 비전문가도 이해할 수 있는 언어 사용

출력 형식:
- 핵심 요약: 3문장 이내
- 주요 발견: 최대 5개
- 원인 분석: 가능한 경우
- 권장 조치: 구체적이고 실행 가능한 것

JSON 형식으로 응답하세요.`,

    user: (data: DailyInsightData) => `
## 분석 대상
- 계정: ${data.accountName}
- 업종: ${data.industry}
- 분석 기간: 최근 24시간

## 현재 성과
${JSON.stringify(data.currentMetrics, null, 2)}

## 전일 대비 변화
${JSON.stringify(data.previousMetrics, null, 2)}

## 7일 트렌드
${JSON.stringify(data.trend, null, 2)}

## Top 5 소재
${JSON.stringify(data.topCreatives, null, 2)}

## 캠페인 현황
${JSON.stringify(data.campaigns, null, 2)}

위 데이터를 분석하여 오늘의 핵심 인사이트를 생성해주세요.
특히 전일 대비 유의미한 변화와 그 원인에 집중해주세요.
`,
  },

  anomalyDetection: {
    system: `당신은 광고 성과 이상 탐지 전문가입니다.
주어진 데이터에서 비정상적인 패턴을 감지하고 원인을 분석합니다.

이상 탐지 기준:
- CPA 30% 이상 급등
- CTR 20% 이상 급락
- 노출수 50% 이상 급감
- 예산 소진 속도 150% 이상
- ROAS 30% 이상 하락

각 이상에 대해:
1. 심각도 판단 (INFO/WARNING/CRITICAL)
2. 가능한 원인 추론
3. 권장 조치 제안

JSON 배열 형식으로 응답하세요.`,

    user: (data: AnomalyDetectionData) => `
## 성과 데이터
${JSON.stringify(data.metrics, null, 2)}

## 탐지 임계값
${JSON.stringify(data.thresholds, null, 2)}

위 데이터에서 이상 징후를 탐지하고 분석해주세요.
`,
  },
};
```

```typescript
// src/lib/ai/prompts/strategy.ts

export const strategyPrompts = {
  budgetOptimization: {
    system: `당신은 광고 예산 최적화 전문가입니다.
ROI를 극대화하기 위한 예산 배분 전략을 제안합니다.

전략 수립 원칙:
1. 데이터 기반 의사결정
2. 리스크 최소화 (급격한 변경 지양)
3. 테스트 가능한 단위로 제안
4. 예상 임팩트 수치화

예산 최적화 전략:
- 고성과 캠페인 예산 증액
- 저성과 캠페인 예산 감액 또는 중단
- 시간대/요일별 예산 조정
- 테스트 예산 확보

각 전략에 대해:
1. 구체적 액션 (어디서 얼마나)
2. 예상 효과 (수치로)
3. 실행 난이도
4. 우선순위

JSON 배열 형식으로 응답하세요.`,

    user: (data: BudgetStrategyData) => `
## 현재 예산 현황
총 예산: ${data.currentBudget}

## 캠페인별 성과
${JSON.stringify(data.campaignPerformance, null, 2)}

## 제약 조건
${JSON.stringify(data.constraints, null, 2)}

## 관련 인사이트
${JSON.stringify(data.insights, null, 2)}

위 데이터를 기반으로 예산 최적화 전략을 제안해주세요.
각 제안은 구체적인 수치와 함께 제공되어야 합니다.
`,
  },

  creativeOptimization: {
    system: `당신은 광고 소재 최적화 전문가입니다.
소재 성과 데이터를 분석하여 크리에이티브 전략을 제안합니다.

분석 관점:
1. 성과 기반 소재 분류 (Top/Bottom)
2. 성공 요인 추출
3. 피로도 기반 교체 시점
4. 신규 소재 제작 방향

전략 유형:
- 고성과 소재 스케일업
- 저성과 소재 교체
- A/B 테스트 설계
- 신규 소재 브리프

JSON 배열 형식으로 응답하세요.`,

    user: (data: CreativeStrategyData) => `
## 소재 성과 현황
${JSON.stringify(data.creatives, null, 2)}

## Top 소재 특성
${JSON.stringify(data.topPerformers, null, 2)}

## Bottom 소재 특성
${JSON.stringify(data.bottomPerformers, null, 2)}

위 데이터를 분석하여 소재 최적화 전략을 제안해주세요.
성공 소재의 공통 요소와 실패 소재의 문제점을 파악하고,
구체적인 개선 방안을 제시해주세요.
`,
  },
};
```

### 4.6 AI 출력 스키마

```typescript
// src/lib/ai/schemas/insight.schema.ts

import { z } from 'zod';

export const InsightSchema = z.object({
  type: z.enum(['DAILY_SUMMARY', 'ANOMALY', 'TREND', 'CREATIVE', 'PREDICTION']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  title: z.string().max(100),
  summary: z.string().max(500),

  keyFindings: z.array(z.object({
    finding: z.string(),
    impact: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
    metric: z.string(),
    change: z.number(),
    evidence: z.string().optional(),
  })).max(5),

  rootCause: z.array(z.object({
    factor: z.string(),
    contribution: z.number().min(0).max(100),
    evidence: z.string(),
  })).optional(),

  recommendations: z.array(z.string()).max(3),
});

export type Insight = z.infer<typeof InsightSchema>;
```

```typescript
// src/lib/ai/schemas/strategy.schema.ts

import { z } from 'zod';

export const StrategySchema = z.object({
  type: z.enum(['BUDGET', 'CAMPAIGN', 'TARGETING', 'CREATIVE', 'BIDDING']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  title: z.string().max(100),
  description: z.string().max(500),

  actionItems: z.array(z.object({
    action: z.string(),
    target: z.string(),
    targetId: z.string(),
    currentValue: z.string().optional(),
    suggestedValue: z.string(),
    reason: z.string(),
  })),

  expectedImpact: z.object({
    metric: z.string(),
    currentValue: z.number(),
    expectedValue: z.number(),
    changePercent: z.number(),
    confidence: z.number().min(0).max(100),
  }),

  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  estimatedEffort: z.string(),
});

export type Strategy = z.infer<typeof StrategySchema>;
```

---

## 5. 소재 분석 알고리즘

### 5.1 피로도 지수 (Fatigue Index) 계산

```typescript
// src/lib/analytics/fatigue-calculator.ts

interface FatigueInput {
  dailyMetrics: {
    date: Date;
    impressions: number;
    ctr: number;
    cvr: number;
    frequency: number;
  }[];
  creativeAge: number;  // 일수
}

interface FatigueOutput {
  index: number;           // 0-100
  trend: PerformanceTrend;
  peakDate: Date | null;
  estimatedExhaustion: Date | null;
  factors: {
    factor: string;
    weight: number;
    value: number;
  }[];
}

export function calculateFatigueIndex(input: FatigueInput): FatigueOutput {
  const { dailyMetrics, creativeAge } = input;

  if (dailyMetrics.length < 3) {
    return {
      index: 0,
      trend: 'STABLE',
      peakDate: null,
      estimatedExhaustion: null,
      factors: [],
    };
  }

  // 1. CTR 하락률 계산 (최근 7일 vs 피크 대비)
  const ctrValues = dailyMetrics.map(m => m.ctr);
  const peakCtr = Math.max(...ctrValues);
  const peakIndex = ctrValues.indexOf(peakCtr);
  const currentCtr = ctrValues[ctrValues.length - 1];
  const ctrDecline = ((peakCtr - currentCtr) / peakCtr) * 100;

  // 2. CVR 하락률 계산
  const cvrValues = dailyMetrics.map(m => m.cvr);
  const peakCvr = Math.max(...cvrValues);
  const currentCvr = cvrValues[cvrValues.length - 1];
  const cvrDecline = ((peakCvr - currentCvr) / peakCvr) * 100;

  // 3. 빈도(Frequency) 증가율
  const recentFrequency = dailyMetrics.slice(-7).reduce((sum, m) => sum + m.frequency, 0) / 7;
  const earlyFrequency = dailyMetrics.slice(0, 7).reduce((sum, m) => sum + m.frequency, 0) / 7;
  const frequencyIncrease = ((recentFrequency - earlyFrequency) / earlyFrequency) * 100;

  // 4. 소재 수명 요소
  const ageScore = Math.min(creativeAge / 30, 1) * 20;  // 30일 기준

  // 가중 평균 계산
  const factors = [
    { factor: 'CTR 하락', weight: 0.35, value: Math.min(ctrDecline, 100) },
    { factor: 'CVR 하락', weight: 0.30, value: Math.min(cvrDecline, 100) },
    { factor: '빈도 증가', weight: 0.20, value: Math.min(frequencyIncrease, 100) },
    { factor: '소재 수명', weight: 0.15, value: ageScore },
  ];

  const index = Math.min(
    factors.reduce((sum, f) => sum + f.weight * f.value, 0),
    100
  );

  // 트렌드 판단
  const recentSlope = calculateSlope(ctrValues.slice(-7));
  let trend: PerformanceTrend;
  if (index >= 80) trend = 'EXHAUSTED';
  else if (recentSlope < -0.05) trend = 'DECLINING';
  else if (recentSlope > 0.05) trend = 'RISING';
  else trend = 'STABLE';

  // 피크 날짜
  const peakDate = dailyMetrics[peakIndex]?.date || null;

  // 예상 소진 날짜 (선형 회귀 기반)
  let estimatedExhaustion: Date | null = null;
  if (trend === 'DECLINING' && index < 80) {
    const daysToExhaustion = (80 - index) / Math.abs(recentSlope * 100);
    estimatedExhaustion = new Date();
    estimatedExhaustion.setDate(estimatedExhaustion.getDate() + daysToExhaustion);
  }

  return {
    index: Math.round(index),
    trend,
    peakDate,
    estimatedExhaustion,
    factors,
  };
}

function calculateSlope(values: number[]): number {
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}
```

### 5.2 소재 스코어링 알고리즘

```typescript
// src/lib/analytics/creative-scorer.ts

interface CreativeScore {
  overall: number;        // 0-100 종합 점수
  breakdown: {
    efficiency: number;   // CTR, CVR 기반
    scale: number;        // 볼륨 기반
    sustainability: number; // 피로도 역수
    engagement: number;   // 영상 시청 지표
  };
  rank: number;
  percentile: number;
}

export function scoreCreative(
  creative: CreativeWithMetrics,
  benchmarks: IndustryBenchmarks
): CreativeScore {
  // 1. 효율성 점수 (CTR, CVR, CPA 기반)
  const ctrScore = normalizeScore(creative.metrics.ctr, benchmarks.ctr);
  const cvrScore = normalizeScore(creative.metrics.cvr, benchmarks.cvr);
  const cpaScore = normalizeScore(benchmarks.cpa, creative.metrics.cpa); // 낮을수록 좋음
  const efficiency = (ctrScore * 0.3 + cvrScore * 0.4 + cpaScore * 0.3);

  // 2. 스케일 점수 (노출, 전환 볼륨)
  const impressionScore = normalizeScore(
    creative.metrics.impressions,
    benchmarks.avgImpressions
  );
  const conversionScore = normalizeScore(
    creative.metrics.conversions,
    benchmarks.avgConversions
  );
  const scale = (impressionScore * 0.4 + conversionScore * 0.6);

  // 3. 지속가능성 점수 (피로도 역수)
  const sustainability = 100 - (creative.fatigue?.index || 0);

  // 4. 인게이지먼트 점수 (영상인 경우)
  let engagement = 50; // 기본값
  if (creative.type === 'VIDEO' && creative.metrics.videoViews) {
    const watchRate = creative.metrics.videoWatched6s / creative.metrics.videoViews;
    const avgPlayScore = normalizeScore(
      creative.metrics.avgVideoPlayTime,
      benchmarks.avgVideoPlayTime
    );
    engagement = (watchRate * 100 * 0.6 + avgPlayScore * 0.4);
  }

  // 가중 평균 종합 점수
  const overall = Math.round(
    efficiency * 0.35 +
    scale * 0.25 +
    sustainability * 0.25 +
    engagement * 0.15
  );

  return {
    overall,
    breakdown: {
      efficiency: Math.round(efficiency),
      scale: Math.round(scale),
      sustainability: Math.round(sustainability),
      engagement: Math.round(engagement),
    },
    rank: 0,      // 전체 계산 후 설정
    percentile: 0, // 전체 계산 후 설정
  };
}

function normalizeScore(value: number, benchmark: number): number {
  // 벤치마크 대비 비율을 0-100 점수로 변환
  const ratio = value / benchmark;
  if (ratio >= 2) return 100;
  if (ratio >= 1.5) return 90;
  if (ratio >= 1.2) return 80;
  if (ratio >= 1) return 70;
  if (ratio >= 0.8) return 60;
  if (ratio >= 0.6) return 50;
  if (ratio >= 0.4) return 30;
  return 10;
}
```

---

## 6. 프로젝트 구조

```
tiktok-analysis/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── accounts/
│   │   │   │   ├── [accountId]/
│   │   │   │   │   ├── page.tsx           # 계정 대시보드
│   │   │   │   │   ├── creatives/
│   │   │   │   │   │   └── page.tsx       # 소재 분석
│   │   │   │   │   ├── insights/
│   │   │   │   │   │   └── page.tsx       # AI 인사이트
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   └── page.tsx       # AI 전략
│   │   │   │   │   └── reports/
│   │   │   │   │       └── page.tsx       # 리포트
│   │   │   │   └── page.tsx               # 계정 목록
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx                   # Overview
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── accounts/
│   │   │   ├── campaigns/
│   │   │   ├── creatives/
│   │   │   ├── metrics/
│   │   │   ├── ai/
│   │   │   │   ├── insights/
│   │   │   │   ├── strategies/
│   │   │   │   └── analyze/
│   │   │   ├── reports/
│   │   │   └── notifications/
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 컴포넌트
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── navigation.tsx
│   │   ├── dashboard/
│   │   │   ├── metric-card.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   └── kpi-summary.tsx
│   │   ├── creatives/
│   │   │   ├── creative-card.tsx
│   │   │   ├── creative-table.tsx
│   │   │   ├── fatigue-chart.tsx
│   │   │   └── score-breakdown.tsx
│   │   ├── ai/
│   │   │   ├── insight-card.tsx
│   │   │   ├── strategy-card.tsx
│   │   │   ├── action-item.tsx
│   │   │   └── impact-preview.tsx
│   │   └── reports/
│   │       ├── report-preview.tsx
│   │       └── report-builder.tsx
│   │
│   ├── lib/
│   │   ├── ai/                        # AI 엔진
│   │   │   ├── client.ts
│   │   │   ├── prompts/
│   │   │   ├── modules/
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   ├── tiktok/                    # TikTok API 통합
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── creatives.ts
│   │   │   └── reports.ts
│   │   ├── analytics/                 # 분석 알고리즘
│   │   │   ├── fatigue-calculator.ts
│   │   │   ├── creative-scorer.ts
│   │   │   ├── anomaly-detector.ts
│   │   │   └── trend-analyzer.ts
│   │   ├── db/                        # 데이터베이스
│   │   │   ├── prisma.ts
│   │   │   └── queries/
│   │   ├── cache/                     # Redis 캐싱
│   │   │   └── redis.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── format.ts
│   │       └── validation.ts
│   │
│   ├── hooks/                         # React Hooks
│   │   ├── use-account.ts
│   │   ├── use-creatives.ts
│   │   ├── use-insights.ts
│   │   └── use-strategies.ts
│   │
│   ├── types/                         # TypeScript 타입
│   │   ├── account.ts
│   │   ├── creative.ts
│   │   ├── insight.ts
│   │   ├── strategy.ts
│   │   └── api.ts
│   │
│   └── jobs/                          # 배치 작업
│       ├── sync-data.ts
│       ├── generate-insights.ts
│       ├── calculate-fatigue.ts
│       └── generate-reports.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 7. 구현 순서

### Phase 1: 기반 구축 (Week 1-2)
1. [ ] 프로젝트 초기화 (Next.js, TypeScript, Tailwind)
2. [ ] Prisma 스키마 설정 및 DB 마이그레이션
3. [ ] 기본 인증 시스템 구현
4. [ ] TikTok OAuth 연동
5. [ ] TikTok API 클라이언트 구현
6. [ ] 기본 데이터 동기화 (캠페인, 광고그룹, 광고)

### Phase 2: 소재 분석 (Week 3-4)
1. [ ] 소재 데이터 수집/저장 로직
2. [ ] 소재 성과 메트릭 집계
3. [ ] 피로도 계산 알고리즘 구현
4. [ ] 소재 스코어링 알고리즘 구현
5. [ ] 소재 분석 API 구현
6. [ ] 소재 분석 UI 컴포넌트

### Phase 3: AI 인사이트 (Week 5-6)
1. [ ] GPT-5.2 클라이언트 설정
2. [ ] 인사이트 생성 프롬프트 개발
3. [ ] 일간 인사이트 생성 모듈
4. [ ] 이상 탐지 모듈
5. [ ] 인사이트 API 구현
6. [ ] 인사이트 UI 컴포넌트

### Phase 4: AI 전략 제안 (Week 7-8)
1. [ ] 전략 제안 프롬프트 개발
2. [ ] 예산 최적화 전략 모듈
3. [ ] 소재 전략 모듈
4. [ ] 전략 API 구현 (생성/수락/거절/완료)
5. [ ] 전략 UI 컴포넌트
6. [ ] 액션 아이템 추적 시스템

### Phase 5: 대시보드 & 리포팅 (Week 9-10)
1. [ ] 메인 대시보드 UI
2. [ ] 성과 차트 컴포넌트
3. [ ] PDF 리포트 생성
4. [ ] Slack 웹훅 연동
5. [ ] 카카오톡 알림톡 연동
6. [ ] 스케줄러 (배치 작업)

### Phase 6: 고도화 (Week 11-12)
1. [ ] 성능 최적화 (캐싱, 인덱싱)
2. [ ] 피드백 루프 구현
3. [ ] 프롬프트 튜닝
4. [ ] 테스트 작성
5. [ ] 문서화
6. [ ] 배포

---

## 8. 설계 체크리스트

### 데이터베이스
- [x] ERD 설계
- [x] Prisma 스키마 정의
- [x] 인덱스 전략 수립

### API
- [x] RESTful API 구조 설계
- [x] 핵심 API 상세 스펙
- [x] 요청/응답 타입 정의

### AI 엔진
- [x] 모듈 구조 설계
- [x] GPT-5.2 통합 설계
- [x] 프롬프트 설계
- [x] 출력 스키마 정의

### 알고리즘
- [x] 피로도 계산 알고리즘
- [x] 소재 스코어링 알고리즘

### 프로젝트 구조
- [x] 디렉토리 구조 설계
- [x] 구현 순서 정의

---

*Document generated by bkit PDCA Skill*
