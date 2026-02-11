# Plan Document: auto-insight-generation

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | auto-insight-generation |
| **작성일** | 2026-02-11 |
| **작성자** | Claude Opus 4.5 |
| **레벨** | Dynamic |
| **우선순위** | Critical |

---

## 문제 정의

### 현재 상황
1. **인사이트/전략이 자동 생성되지 않음** - 수동 버튼 클릭 필요
2. **DB에 데이터 없음** - 새로고침해도 표시할 데이터 없음
3. **실시간 모니터링 없음** - 이상 징후 감지 불가

### 근본 원인
1. 자동 생성 스케줄러 부재
2. `.env` 파일 미설정 (OPENAI_API_KEY)
3. 초기 데이터 생성 로직 없음

---

## 목표

1. ✅ 매일 자동으로 인사이트/전략 생성
2. ✅ 실시간 이상 징후 감지 및 알림
3. ✅ 계정 생성 시 초기 인사이트 자동 생성
4. ✅ API 키 없이도 동작하는 fallback 모드

---

## 구현 범위

### Phase 1: 환경 설정 검증

#### 1.1 .env 파일 검증
- [ ] OPENAI_API_KEY 존재 확인
- [ ] API 키 없을 때 graceful fallback

#### 1.2 API 에러 핸들링 개선
- [ ] OpenAI API 호출 실패 시 mock 데이터 반환
- [ ] 에러 로깅 및 알림

### Phase 2: 자동 생성 시스템

#### 2.1 API Route 기반 스케줄러
- **경로**: `/api/jobs/daily-insights`
- **호출 방법**: Vercel Cron 또는 외부 스케줄러 (cron-job.org)
- **주기**: 매일 오전 9시 (KST)

```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/jobs/daily-insights",
    "schedule": "0 0 * * *"  // UTC 0:00 = KST 9:00
  }]
}
```

#### 2.2 인사이트 자동 생성
- 모든 활성 계정에 대해 일일 인사이트 생성
- 타입: DAILY_SUMMARY, ANOMALY, TREND, CREATIVE, PREDICTION

#### 2.3 전략 자동 생성
- 인사이트 기반 전략 자동 생성
- 우선순위 자동 결정 (CRITICAL 인사이트 → HIGH 전략)

### Phase 3: 실시간 이상 감지

#### 3.1 메트릭 변화 감지
- 이전 기간 대비 급격한 변화 감지
- 임계값: CPA +30%, CTR -25%, ROAS -20%

#### 3.2 즉시 알림
- ANOMALY 타입 인사이트 생성
- Notification 생성 및 연결
- 심각도: CRITICAL

### Phase 4: Fallback 모드

#### 4.1 API 키 없을 때
- 규칙 기반 인사이트 생성 (AI 없이)
- 메트릭 변화율 기반 자동 분석

#### 4.2 Mock 데이터 생성기
- 시연/테스트용 샘플 데이터 생성
- `/api/seed/insights` API

---

## 기술 스택

| 기능 | 기술 |
|------|------|
| 스케줄러 | Vercel Cron / cron-job.org |
| AI | OpenAI GPT-4o |
| Fallback | Rule-based analysis |
| 알림 | 내부 Notification 시스템 |

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/app/api/jobs/daily-insights/route.ts` | 일일 인사이트 생성 Job |
| `src/app/api/jobs/anomaly-detection/route.ts` | 이상 감지 Job |
| `src/app/api/seed/insights/route.ts` | 샘플 데이터 생성 |
| `src/lib/ai/fallback.ts` | AI 없이 동작하는 분석 모듈 |
| `vercel.json` | Cron 설정 |

---

## 구현 순서

1. [x] Phase 1: 환경 설정 검증
2. [x] Phase 2.1: daily-insights Job API 생성
3. [x] Phase 2.2: 인사이트 자동 생성 로직
4. [x] Phase 2.3: 전략 자동 생성 로직
5. [x] Phase 3: 실시간 이상 감지
6. [x] Phase 4: Fallback 모드 및 Seed API
7. [x] vercel.json Cron 설정

---

## 예상 작업량

- Phase 1: 30분
- Phase 2: 2시간
- Phase 3: 1시간
- Phase 4: 1시간
- **총**: 약 4-5시간

---

## 체크리스트

- [x] daily-insights Job 동작 확인
- [x] 인사이트 자동 생성 확인
- [x] 전략 자동 생성 확인
- [x] 이상 감지 알림 확인
- [x] Fallback 모드 동작 확인
- [x] Vercel Cron 설정 확인

---

## 다음 단계

`.env` 파일에 OPENAI_API_KEY 설정 후:
1. `/pdca do auto-insight-generation` 로 구현 시작
2. 또는 먼저 seed API로 샘플 데이터 생성
