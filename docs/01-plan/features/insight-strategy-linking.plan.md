# Plan: 인사이트-전략 자동 연결

**Feature**: insight-strategy-linking
**Created**: 2026-02-12
**Status**: ✅ Completed (PDCA 완료)

---

## 1. 배경 및 목적

### 1.1 현재 상태

인사이트-전략 연결을 위한 인프라가 **이미 95% 구현**되어 있습니다:

| 항목 | 상태 | 설명 |
|------|------|------|
| DB 관계 모델 | ✅ 완료 | `AIStrategy.insightId` → `AIInsight.id` |
| 인사이트 컴포넌트 UI | ✅ 완료 | "전략으로 전환" 버튼 있음 |
| 전략 생성 API | ✅ 완료 | `insightId` 파라미터 수용 |
| 인사이트 페이지 핸들러 | ❌ 미구현 | 콜백 함수 연결 필요 |

### 1.2 목적

1. 인사이트 상세 화면에서 "전략으로 전환" 버튼 활성화
2. 클릭 시 해당 인사이트 기반 전략 자동 생성
3. 생성된 전략이 인사이트와 자동 연결

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | 인사이트 상세에서 "전략으로 전환" 버튼 활성화 | High |
| FR-02 | 버튼 클릭 시 전략 생성 API 호출 (insightId 포함) | High |
| FR-03 | 생성 중 로딩 상태 표시 | Medium |
| FR-04 | 생성 완료 후 성공 메시지/토스트 | Medium |
| FR-05 | 연결된 전략 개수 표시 (선택적) | Low |

### 2.2 비기능 요구사항

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-01 | 전략 생성 응답 시간 | < 10초 (OpenAI 호출 포함) |
| NFR-02 | 타입 안전성 | TypeScript 100% |

---

## 3. 범위

### 3.1 포함 (In Scope)

1. **계정 인사이트 페이지 개선**
   - `handleConvertToStrategy` 함수 구현
   - InsightDetailSheet에 콜백 연결

2. **캠페인 인사이트 페이지 개선** (동일 패턴 적용)

3. **API 호출**
   - `POST /api/ai/strategies/{accountId}/generate`
   - Request body: `{ insightId: string }`

### 3.2 제외 (Out of Scope)

1. ❌ DB 스키마 변경 (이미 완료)
2. ❌ 전략 생성 API 수정 (이미 완료)
3. ❌ InsightDetailSheet UI 수정 (이미 완료)

---

## 4. 기술적 접근

### 4.1 구현 방법

```typescript
// 인사이트 페이지에 추가할 핸들러
const handleConvertToStrategy = async (insightId: string) => {
  setConverting(true);
  try {
    const response = await fetch(`/api/ai/strategies/${accountId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId }),
    });

    if (response.ok) {
      // 성공 처리 (토스트 또는 전략 페이지 이동)
      toast.success('전략이 생성되었습니다');
      // 선택적: 전략 페이지로 이동
    }
  } catch (error) {
    toast.error('전략 생성에 실패했습니다');
  } finally {
    setConverting(false);
  }
};
```

### 4.2 데이터 흐름

```
인사이트 상세 화면
    │
    └── "전략으로 전환" 버튼 클릭
            │
            ↓
    POST /api/ai/strategies/{accountId}/generate
    Body: { insightId: "insight-id" }
            │
            ↓
    전략 생성 (OpenAI or Fallback)
            │
            ↓
    AIStrategy 저장 (insightId 자동 연결)
            │
            ↓
    성공 응답 → UI 업데이트
```

---

## 5. 구현 계획

### Phase 1: 계정 인사이트 페이지

1. `handleConvertToStrategy` 함수 추가
2. `converting` 로딩 상태 추가
3. InsightDetailSheet 또는 InsightCard에 콜백 연결
4. 성공/실패 피드백 (toast)

### Phase 2: 캠페인 인사이트 페이지

1. 동일 패턴 적용

---

## 6. 성공 기준

- [ ] 인사이트 상세에서 "전략으로 전환" 버튼 동작
- [ ] 전략 생성 API 호출 시 insightId 전달
- [ ] 생성된 전략이 해당 인사이트와 연결
- [ ] 로딩 상태 표시
- [ ] 빌드 및 타입 체크 통과

---

*Created by bkit PDCA plan phase*
