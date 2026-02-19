# Plan: 데이터 정확성 검증 및 수정 (data-accuracy-fix)

## 개요

- **작성일**: 2026-02-19
- **우선순위**: Critical (P0)
- **예상 범위**: 15개 파일 수정, 3개 유틸리티 추가
- **코드 품질 점수**: 72/100 (분석 기준)

## 문제 정의

### 사용자 보고 증상
1. **지출(Spend) 및 노출수(Impressions)가 실제 TikTok Ads Manager와 맞지 않음**
2. **날짜 셀렉터 선택 값이 정확하지 않음** (기간 선택 후 데이터 불일치)
3. **광고 그룹 상태가 실제와 다르게 표시됨** (운영중인데 일시정지로 표시)

### 근본 원인 분석

#### 1. Timezone 처리 미흡
- TikTok API 응답 날짜(`stat_time_day`)를 단순 문자열 split으로 처리
- `new Date("2026-02-06")`이 UTC midnight으로 파싱되어 KST 기준 전날 데이터 포함
- 저장과 조회 시 시간대 불일치로 날짜 경계 데이터 누락/중복

#### 2. 상태 값 매핑 오류
- TikTok API 상태값(`ENABLE`, `ACTIVE`, `DISABLE` 등)을 정규화 없이 저장
- UI에서 `status === 'ENABLE'`만 '운영중', 나머지 모두 '일시정지'로 표시
- 결과: `ACTIVE` 상태도 '일시정지'로 잘못 표시

#### 3. 날짜 범위 계산 불명확
- 프리셋 "최근 7일"이 `subDays(new Date(), 6)`으로 계산 (의미 불명확)
- URL 파라미터 변환 시 timezone 정보 손실

## 영향받는 파일

### Critical (즉시 수정)
| 파일 | 문제 | 수정 내용 |
|------|------|----------|
| `src/lib/tiktok/client.ts` (351-353) | 날짜 변환 시 timezone 미반영 | KST 기준 날짜 파싱 로직 추가 |
| `src/app/api/accounts/[accountId]/sync/route.ts` (186) | Date 파싱 UTC 문제 | 로컬 자정 기준 파싱 |
| `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx` (450-451) | 상태 표시 로직 오류 | 상태 매핑 완성 |

### High (단기 수정)
| 파일 | 문제 | 수정 내용 |
|------|------|----------|
| `src/app/api/accounts/[accountId]/campaigns/[campaignId]/metrics/route.ts` (50-51) | 쿼리 날짜 UTC 파싱 | 로컬 시간대 적용 |
| `src/app/api/accounts/[accountId]/metrics/route.ts` (39-40) | 동일 문제 | 동일 수정 |
| `src/hooks/use-url-state.ts` (157-165) | toISOString 변환 시 timezone 손실 | formatInTimeZone 사용 |
| `src/components/filters/date-range-picker.tsx` (42-59) | 프리셋 날짜 계산 불명확 | 명확한 정의로 수정 |

### Medium (유틸리티 추가)
| 파일 | 목적 |
|------|------|
| `src/lib/utils/date.ts` | 날짜 파싱/포맷 유틸리티 (timezone 처리) |
| `src/lib/utils/status.ts` | 상태 정규화 및 레이블 매핑 |

## 해결 방안

### Phase 1: Timezone 유틸리티 생성

```typescript
// src/lib/utils/date.ts
export function parseLocalDate(dateStr: string): Date {
  // "2026-02-06" → 로컬 자정 (KST 00:00:00)
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  // Date → "2026-02-06" (로컬 시간대 기준)
  return format(date, 'yyyy-MM-dd');
}

export function getDateRangeForQuery(startDate: Date, endDate: Date) {
  // 로컬 날짜 범위 → UTC 쿼리 범위 변환
  // startDate 00:00 로컬 → UTC 시작
  // endDate 23:59:59 로컬 → UTC 끝
}
```

### Phase 2: 상태 정규화 유틸리티

```typescript
// src/lib/utils/status.ts
const STATUS_MAP = {
  ENABLE: 'ACTIVE',
  ACTIVE: 'ACTIVE',
  DISABLE: 'PAUSED',
  PAUSED: 'PAUSED',
  DELETE: 'DELETED',
  DELETED: 'DELETED',
  // ... 모든 가능한 값
} as const;

export function normalizeStatus(raw: string): NormalizedStatus {
  return STATUS_MAP[raw] || 'UNKNOWN';
}

export function getStatusLabel(status: NormalizedStatus): string {
  const labels = {
    ACTIVE: '운영중',
    PAUSED: '일시정지',
    DELETED: '삭제됨',
    UNKNOWN: '알 수 없음',
  };
  return labels[status];
}

export function getStatusVariant(status: NormalizedStatus) {
  const variants = {
    ACTIVE: 'default',
    PAUSED: 'secondary',
    DELETED: 'destructive',
    UNKNOWN: 'outline',
  };
  return variants[status];
}
```

### Phase 3: API 수정

1. **sync/route.ts**: 날짜 파싱 시 `parseLocalDate()` 사용
2. **metrics API들**: 쿼리 시 `getDateRangeForQuery()` 사용
3. **adgroups API**: 상태 저장 시 `normalizeStatus()` 적용

### Phase 4: UI 수정

1. **캠페인 상세 페이지**: `getStatusLabel()`, `getStatusVariant()` 사용
2. **광고 그룹 상세 페이지**: 동일 적용
3. **date-range-picker**: 프리셋 정의 명확화

## 검증 방법

### 수동 검증
1. TikTok Ads Manager에서 특정 캠페인의 7일 데이터 확인
2. 플랫폼에서 동일 캠페인 데이터 조회
3. 수치 비교 (지출, 노출, CTR 등)

### 자동 검증 스크립트
```bash
# scripts/verify-data-accuracy.js
# TikTok API 직접 호출 vs DB 저장 데이터 비교
```

### 상태 검증
1. TikTok에서 운영중인 광고 그룹 확인
2. 플랫폼에서 동일 광고 그룹 상태 확인
3. 상태 표시 일치 확인

## 성공 기준

- [ ] 지출/노출수가 TikTok Ads Manager와 1% 이내 오차
- [ ] 날짜 선택기 "최근 7일"이 정확히 7일 데이터 표시
- [ ] 광고 그룹 상태가 TikTok 실제 상태와 100% 일치

## 리스크

1. **기존 데이터 마이그레이션**: 저장된 날짜 데이터가 이미 불일치 → 재동기화 필요 가능
2. **성능 영향**: timezone 변환 로직 추가로 약간의 오버헤드
3. **하위 호환성**: URL 파라미터 형식 변경 시 기존 북마크 깨짐 가능

---

## 추가 발견 문제 (코드 분석)

### Critical (즉시 수정 필요) - 5건

| 파일 | 라인 | 문제 | 영향 |
|------|------|------|------|
| `src/lib/tiktok/client.ts` | 29-58 | **Race Condition in Rate Limiter** - 인스턴스 변수로 카운터 관리, Serverless 환경에서 무력화 | API 호출 제한 실패 |
| `src/lib/cache/index.ts` | 17-19 | **Memory Leak** - `setInterval` 기반 cleanup이 serverless에서 메모리 누수 | 성능 저하 |
| `src/lib/api/rate-limit.ts` | 32-39 | **In-Memory Rate Limit** - Map 기반이라 serverless 인스턴스 간 공유 안됨 | Rate limit 무력화 |
| `src/app/api/auth/tiktok/callback/route.ts` | 62-63 | **Hardcoded Token Expiry** - TikTok `expires_in` 무시하고 24시간 하드코딩 | 토큰 만료 오류 |
| `src/app/api/accounts/[accountId]/sync/route.ts` | 188-235 | **N+1 Query** - 메트릭마다 개별 `findFirst` + `update/create` | 성능 심각 저하 |

### Warning (개선 필요) - 10건

| 파일 | 라인 | 문제 | 권장 조치 |
|------|------|------|----------|
| `src/lib/tiktok/client.ts` | 366 | ROAS 계산에서 전환가치 50,000원 하드코딩 | `config.analytics.defaultConversionValue` 사용 |
| `src/app/api/accounts/[accountId]/metrics/route.ts` | 72 | 동일 - 전환가치 하드코딩 | 계정별 `conversionValue` 사용 |
| `src/app/api/auth/tiktok/callback/route.ts` | 28-32 | **Weak CSRF** - state 검증 우회 가능 | 필수 검증으로 변경 |
| `src/app/api/jobs/daily-insights/route.ts` | 31-38 | 개발 환경에서 Cron 인증 생략 가능 | 로컬 secret 필수 |
| `src/app/(dashboard)/accounts/[accountId]/page.tsx` | 100-123 | 에러 처리 없음, 순차 API 호출 | 에러 UI + `Promise.all` |
| `src/lib/hooks/useQueries.ts` | 14-22 | 에러 메시지만 throw, 상태 코드 손실 | 에러 객체에 status 포함 |
| `src/app/api/ai/insights/[accountId]/generate/route.ts` | 70-72 | `metrics[0]`/`metrics[1]` 인덱싱, 데이터 1개면 오류 | 배열 길이 확인 |
| `src/lib/jobs/sync-creatives.ts` | 64-71 | Sequential creative processing | 배치 처리 사용 |
| `src/app/api/accounts/[accountId]/sync/route.ts` | 39-65 | Sequential campaign upsert | 트랜잭션 배치 |

### Info (참고) - 3건

| 파일 | 문제 | 비고 |
|------|------|------|
| `src/lib/crypto.ts:160-165` | 암호화 키 미설정 시 평문 반환 | 프로덕션 배포 시 확인 필요 |
| `src/lib/db/prisma.ts:42-99` | Soft delete 잘 구현됨 | 양호 |
| `src/lib/config.ts` | 환경 변수 중앙화 잘 됨 | 일부 파일에서 미사용 |

---

## 수정 우선순위 재정리

### Phase 1: Critical 수정 (데이터 정확성 직접 영향)
1. Timezone 유틸리티 생성 및 적용
2. 상태 정규화 유틸리티 생성 및 적용
3. N+1 쿼리 개선 (sync API)
4. ROAS 계산 하드코딩 제거

### Phase 2: Critical 수정 (인프라)
5. CSRF 검증 강화
6. Token 만료 처리 수정
7. Rate limiter 개선 (Redis 도입 또는 대안)

### Phase 3: Warning 수정
8. 에러 핸들링 일관화
9. API 호출 병렬화
10. 배치 처리 적용

---

## 다음 단계

1. `/pdca design data-accuracy-fix` - 상세 설계 문서 작성
2. Phase 1 유틸리티 함수 구현 및 테스트
3. Phase 1 API 수정 및 검증
4. Phase 2 인프라 수정
5. Phase 3 최적화 수정
6. UI 수정 및 최종 검증
