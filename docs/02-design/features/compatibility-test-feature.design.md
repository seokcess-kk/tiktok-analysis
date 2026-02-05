# compatibility-test-feature Design Document

> **Summary**: bkit v1.5.0과 Claude Code v2.1.31 호환성 테스트용 샘플 기능 설계
>
> **Project**: bkit-claude-code
> **Version**: 1.5.0
> **Author**: Claude
> **Date**: 2026-02-04
> **Status**: Draft
> **Planning Doc**: [compatibility-test-feature.plan.md](../01-plan/features/compatibility-test-feature.plan.md)

### Pipeline References (if applicable)

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A |
| Phase 2 | Coding Conventions | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | N/A |

> **Note**: 이 문서는 PDCA Workflow 테스트용이므로 실제 구현은 없음.

---

## 1. Overview

### 1.1 Design Goals

- PDCA Workflow 전체 사이클 검증
- Plan → Design → Do → Check → Act → Report 단계 기능 테스트
- bkit v1.5.0과 Claude Code v2.1.31 호환성 확인

### 1.2 Design Principles

- Simple: 테스트 목적에 맞는 최소한의 설계
- Verifiable: 각 PDCA 단계별 검증 가능
- Traceable: 테스트 결과 추적 가능

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PDCA      │────▶│   bkit      │────▶│   Claude    │
│   Skill     │     │   Plugin    │     │   Code      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 Data Flow

```
/pdca command → Skill Parser → Action Executor → Document Generator → Memory Update
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| PDCA Skill | bkit Plugin | PDCA 명령어 처리 |
| bkit Plugin | Claude Code | Hook 및 Tool 연동 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// PDCA Status
interface PDCAStatus {
  feature: string;
  phase: 'plan' | 'design' | 'do' | 'check' | 'act' | 'report' | 'completed';
  matchRate?: number;
  iterationCount?: number;
  startedAt: string;
  updatedAt: string;
}
```

### 3.2 Entity Relationships

```
[Feature] 1 ──── 1 [PDCAStatus]
   │
   └── 1 ──── N [Document] (plan, design, analysis, report)
```

---

## 4. API Specification

### 4.1 PDCA Skill Commands

| Command | Description | Output |
|---------|-------------|--------|
| `/pdca plan {feature}` | Plan 문서 생성 | `docs/01-plan/features/{feature}.plan.md` |
| `/pdca design {feature}` | Design 문서 생성 | `docs/02-design/features/{feature}.design.md` |
| `/pdca do {feature}` | 구현 가이드 제공 | Console output |
| `/pdca analyze {feature}` | Gap 분석 | `docs/03-analysis/{feature}.analysis.md` |
| `/pdca iterate {feature}` | 자동 개선 | Code fixes + re-analysis |
| `/pdca report {feature}` | 보고서 생성 | `docs/04-report/features/{feature}.report.md` |

---

## 5. Test Plan

### 5.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Integration Test | PDCA Workflow | Manual execution |
| Functional Test | Each PDCA command | Manual verification |

### 5.2 Test Cases (Key)

- [x] E1-01: Plan 시작 (`/pdca plan`)
- [x] E1-02: Plan→Design 전환
- [x] E1-03: Design 시작 (`/pdca design`)
- [ ] E1-04: Design→Do 전환
- [ ] E1-05: Do 단계 (`/pdca do`)
- [ ] E1-06: Do→Check 전환
- [ ] E1-07: Check (분석) (`/pdca analyze`)
- [ ] E1-08: Check≥90%→Report
- [ ] E1-09: Check<90%→Act
- [ ] E1-10: Act (개선) (`/pdca iterate`)
- [ ] E1-11: Act→Check 재분석
- [ ] E1-12: Report 생성 (`/pdca report`)

---

## 6. Implementation Guide

### 6.1 File Structure

```
docs/
├── 01-plan/features/
│   └── compatibility-test-feature.plan.md
├── 02-design/features/
│   └── compatibility-test-feature.design.md
├── 03-analysis/
│   └── compatibility-test-feature.analysis.md (to be created)
├── 04-report/features/
│   └── compatibility-test-feature.report.md (to be created)
└── .bkit-memory.json
```

### 6.2 Implementation Order

1. [x] Plan 문서 생성
2. [x] Design 문서 생성
3. [ ] Do 가이드 확인
4. [ ] Gap 분석 실행
5. [ ] 보고서 생성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-04 | Initial draft for PDCA test | Claude |
