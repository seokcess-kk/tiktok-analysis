# bkit v1.5.0 + Claude Code v2.1.31 Compatibility Test Plan

> **Summary**: bkit v1.5.0의 전체 기능이 Claude Code v2.1.31과 완전 호환되는지 검증하는 종합 테스트 계획서
>
> **Project**: bkit-claude-code
> **Version**: 1.5.0
> **Author**: bkit Team
> **Date**: 2026-02-04
> **Status**: Draft
> **Claude Code Version**: v2.1.31 (from v2.1.29)

---

## 1. Overview

### 1.1 Purpose

Claude Code CLI가 v2.1.29에서 v2.1.31로 업데이트됨에 따라, bkit v1.5.0의 모든 기능(21 Skills, 11 Agents, 6 Hook Events, 141 Library Functions)이 정상 작동하는지 종합 검증합니다.

### 1.2 Background

**Claude Code v2.1.30 + v2.1.31 주요 변경사항**:
- PDF `pages` 파라미터 추가
- `temperatureOverride` 스트리밍 API 버그 수정
- Bash 샌드박스 "Read-only file system" 오류 수정
- MCP OAuth 지원 추가
- Task 도구 메트릭 추가 (토큰, 도구 사용, 시간)
- 서브에이전트 MCP 도구 접근 수정
- 시스템 프롬프트 전용 도구 사용 안내 강화
- `--resume` 메모리 사용량 68% 감소
- 프롬프트 캐시 무효화 수정

### 1.3 Related Documents

- Report: `docs/04-report/features/claude-code-v2.1.31-update.report.md`
- bkit Config: `bkit.config.json`
- Claude Code CHANGELOG: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

---

## 2. Scope

### 2.1 In Scope

- [ ] **Skills 테스트**: 21개 전체 Skills 기능 검증
- [ ] **Agents 테스트**: 11개 전체 Agents 기능 검증
- [ ] **Hooks 테스트**: 6개 Hook Events 정상 작동 검증
- [ ] **Library 테스트**: 주요 141개 함수 정상 작동 검증
- [ ] **PDCA 워크플로우 테스트**: Plan→Design→Do→Check→Act 전체 사이클
- [ ] **v2.1.31 변경사항 연동 테스트**: PDF, Bash, MCP, Task 메트릭 등
- [ ] **다국어 지원 테스트**: 8개 언어 트리거 매칭

### 2.2 Out of Scope

- Claude Code 내부 구현 테스트 (Anthropic 책임)
- 네트워크 환경별 테스트 (VPN, 프록시 등)
- 타사 MCP 서버 심층 테스트 (Slack, GitHub 등)

---

## 3. Test Environment

### 3.1 Required Environment

| Component | Version | Status |
|-----------|---------|--------|
| Claude Code CLI | v2.1.31 | Required |
| bkit Plugin | v1.5.0 | Required |
| Node.js | v18+ | Required |
| Git | 2.x | Required |
| OS | macOS/Linux/Windows | Any |

### 3.2 Pre-Test Checklist

```bash
# Claude Code 버전 확인
claude --version  # Expected: 2.1.31

# bkit 플러그인 설치 확인
ls ~/.claude/plugins/bkit-claude-code/  # 또는 로컬 경로

# 테스트 프로젝트 준비
mkdir test-bkit-compatibility && cd test-bkit-compatibility
git init
npm init -y
```

---

## 4. Test Categories

### 4.1 Test Category Overview

| Category | Test Cases | Priority | Estimated Time |
|----------|-----------|----------|----------------|
| A. Skills | 63 | Critical | 2h |
| B. Agents | 33 | Critical | 1.5h |
| C. Hooks | 24 | High | 1h |
| D. Library Functions | 28 | Medium | 1h |
| E. PDCA Workflow | 12 | Critical | 1h |
| F. v2.1.31 Specific | 15 | High | 1h |
| G. Multi-language | 8 | Medium | 30m |
| **Total** | **183** | - | **8h** |

---

## 5. Category A: Skills Test Cases (21 Skills, 63 Cases)

### A.1 Project Level Skills (3 Skills)

#### A.1.1 /starter Skill

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| A1-01 | Skill 호출 | `/starter` | starter guide 표시, next-skill: phase-1-schema | Critical |
| A1-02 | 초기화 명령 | `init starter` | 프로젝트 초기화 안내 | High |
| A1-03 | 트리거 매칭 | "정적 웹사이트 만들고 싶어" | starter skill 자동 제안 | Medium |

#### A.1.2 /dynamic Skill

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| A2-01 | Skill 호출 | `/dynamic` | dynamic guide 표시, bkend.ai 안내 | Critical |
| A2-02 | 초기화 명령 | `init dynamic` | BaaS 프로젝트 초기화 안내 | High |
| A2-03 | 트리거 매칭 | "로그인 기능 추가해줘" | dynamic skill 자동 제안 | Medium |

#### A.1.3 /enterprise Skill

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| A3-01 | Skill 호출 | `/enterprise` | enterprise guide 표시, K8s/Terraform 안내 | Critical |
| A3-02 | 초기화 명령 | `init enterprise` | Monorepo 설정 안내 | High |
| A3-03 | 트리거 매칭 | "마이크로서비스 아키텍처 설계" | enterprise skill 자동 제안 | Medium |

---

### A.2 PDCA Skill (1 Skill, 8 Actions)

#### A.2.1 /pdca Skill Actions

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| A4-01 | Plan action | `/pdca plan login-feature` | Plan 문서 생성 가이드, Task 생성 | Critical |
| A4-02 | Design action | `/pdca design login-feature` | Design 문서 생성 가이드 | Critical |
| A4-03 | Do action | `/pdca do login-feature` | 구현 가이드 표시 | High |
| A4-04 | Analyze action | `/pdca analyze login-feature` | gap-detector 호출 | Critical |
| A4-05 | Iterate action | `/pdca iterate login-feature` | pdca-iterator 호출 | High |
| A4-06 | Report action | `/pdca report login-feature` | report-generator 호출 | High |
| A4-07 | Status action | `/pdca status` | 현재 PDCA 상태 표시 | Medium |
| A4-08 | Next action | `/pdca next` | 다음 단계 안내 | Medium |

---

### A.3 Pipeline Phase Skills (9 Skills)

#### A.3.1 Phase Skills Overview

| TC-ID | Skill | Input | Expected Output | Priority |
|-------|-------|-------|-----------------|----------|
| A5-01 | /phase-1-schema | `/phase-1-schema` | 스키마 설계 가이드, 템플릿 제공 | High |
| A5-02 | /phase-2-convention | `/phase-2-convention` | 컨벤션 정의 가이드 | High |
| A5-03 | /phase-3-mockup | `/phase-3-mockup` | 목업 생성 가이드 | High |
| A5-04 | /phase-4-api | `/phase-4-api` | API 설계 가이드, Zero Script QA | High |
| A5-05 | /phase-5-design-system | `/phase-5-design-system` | 디자인 시스템 가이드 | High |
| A5-06 | /phase-6-ui-integration | `/phase-6-ui-integration` | UI 통합 가이드 | High |
| A5-07 | /phase-7-seo-security | `/phase-7-seo-security` | SEO/보안 가이드 | High |
| A5-08 | /phase-8-review | `/phase-8-review` | 코드 리뷰 가이드 | High |
| A5-09 | /phase-9-deployment | `/phase-9-deployment` | 배포 가이드 | High |

#### A.3.2 Phase Skill Transitions

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| A6-01 | Phase 1→2 전환 | Phase 1 완료 후 | Phase 2 자동 제안 | Medium |
| A6-02 | Phase 2→3 전환 | Phase 2 완료 후 | Phase 3 자동 제안 | Medium |
| A6-03 | Starter 레벨 스킵 | Phase 4 스킵 | Dynamic 전용 안내 | Medium |

---

### A.4 Utility Skills (6 Skills)

| TC-ID | Skill | Input | Expected Output | Priority |
|-------|-------|-------|-----------------|----------|
| A7-01 | /code-review | `/code-review` | 코드 품질 분석 시작 | High |
| A7-02 | /zero-script-qa | `/zero-script-qa` | QA 가이드 표시 | Medium |
| A7-03 | /claude-code-learning | `/claude-code-learning` | Claude Code 학습 시작 | Medium |
| A7-04 | /mobile-app | `/mobile-app` | 모바일 앱 개발 가이드 | Medium |
| A7-05 | /desktop-app | `/desktop-app` | 데스크톱 앱 개발 가이드 | Medium |
| A7-06 | /development-pipeline | `/development-pipeline` | 9단계 파이프라인 안내 | High |

### A.5 System Skills (2 Skills)

| TC-ID | Skill | Input | Expected Output | Priority |
|-------|-------|-------|-----------------|----------|
| A8-01 | bkit-rules | 자동 적용 | PDCA 규칙 컨텍스트에 포함 | Critical |
| A8-02 | bkit-templates | 템플릿 요청 | 템플릿 목록 및 사용법 | Medium |

---

## 6. Category B: Agents Test Cases (11 Agents, 33 Cases)

### B.1 Level-Based Agents (3 Agents)

#### B.1.1 starter-guide Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B1-01 | 자동 트리거 | "초보자인데 웹사이트 만들고 싶어요" | starter-guide 자동 호출 | High |
| B1-02 | 수동 호출 | Task tool로 직접 호출 | 친화적 가이드 제공 | Medium |
| B1-03 | 다국어 트리거 | "beginner" / "初心者" / "principiante" | 언어별 트리거 작동 | Medium |

#### B.1.2 bkend-expert Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B2-01 | Dynamic 레벨 감지 | .mcp.json 존재 프로젝트 | bkend-expert 자동 제안 | High |
| B2-02 | 인증 구현 요청 | "로그인 기능 구현해줘" | bkend.ai 인증 가이드 | High |
| B2-03 | MCP 도구 접근 | mcp__bkend__* 호출 | MCP 도구 정상 접근 (v2.1.30 수정) | Critical |

#### B.1.3 enterprise-expert Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B3-01 | Enterprise 레벨 감지 | kubernetes/ 디렉토리 존재 | enterprise-expert 자동 제안 | High |
| B3-02 | 아키텍처 설계 | "마이크로서비스 아키텍처 설계" | 전략적 아키텍처 가이드 | High |
| B3-03 | Task 도구 사용 | Task 도구로 서브에이전트 호출 | 메트릭 반환 확인 (v2.1.30) | Medium |

---

### B.2 PDCA Agents (4 Agents)

#### B.2.1 gap-detector Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B4-01 | Gap 분석 실행 | `/pdca analyze feature` | 설계-구현 Gap 분석 결과 | Critical |
| B4-02 | Match Rate 계산 | 설계문서 + 구현코드 | Match Rate % 반환 | Critical |
| B4-03 | 90% 이상 결과 | Match Rate >= 90% | Report 단계 제안 | High |
| B4-04 | 90% 미만 결과 | Match Rate < 90% | Act 단계 제안 (iterate) | High |

#### B.2.2 pdca-iterator Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B5-01 | 자동 개선 실행 | `/pdca iterate feature` | 코드 자동 개선 | High |
| B5-02 | 반복 제한 | 5회 반복 후 | 최대 반복 횟수 도달 알림 | Medium |
| B5-03 | 재분석 트리거 | 개선 완료 후 | gap-detector 재호출 제안 | High |

#### B.2.3 report-generator Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B6-01 | 보고서 생성 | `/pdca report feature` | 완료 보고서 생성 | High |
| B6-02 | 메트릭 포함 | Task 도구 결과 | 토큰/시간 메트릭 포함 가능 (v2.1.30) | Medium |

#### B.2.4 pipeline-guide Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B7-01 | 파이프라인 안내 | "어디서 시작해야 해?" | 현재 위치 + 다음 단계 | High |
| B7-02 | 레벨별 가이드 | Starter/Dynamic/Enterprise | 레벨별 필수/선택 단계 | Medium |

---

### B.3 Quality Agents (4 Agents)

#### B.3.1 code-analyzer Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B8-01 | 코드 품질 분석 | 코드 파일 제공 | 품질/보안/성능 이슈 | High |
| B8-02 | LSP 도구 사용 | LSP 기반 분석 | 타입 오류 감지 | Medium |
| B8-03 | 트리거 매칭 | "코드 리뷰 해줘" | code-analyzer 자동 제안 | Medium |

#### B.3.2 design-validator Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B9-01 | 설계 문서 검증 | 설계 문서 경로 | 완성도/일관성 분석 | High |
| B9-02 | API 패턴 검증 | API 스펙 문서 | api-patterns.md 기준 검증 | Medium |

#### B.3.3 qa-monitor Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B10-01 | Docker 로그 모니터링 | `docker logs` 출력 | 에러 감지 및 문서화 | High |
| B10-02 | Bash 명령 실행 | QA 관련 bash | 샌드박스 오류 없음 (v2.1.31 수정) | Critical |

#### B.3.4 infra-architect Agent

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| B11-01 | 인프라 설계 | K8s/Terraform 요청 | 인프라 아키텍처 가이드 | High |
| B11-02 | CI/CD 파이프라인 | 배포 파이프라인 요청 | CI/CD 설정 가이드 | Medium |

---

## 7. Category C: Hooks Test Cases (6 Events, 24 Cases)

### C.1 SessionStart Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C1-01 | 세션 시작 초기화 | 새 세션 시작 | PDCA 상태 초기화, 온보딩 표시 | Critical |
| C1-02 | 세션 재개 | `--resume` 옵션 | 이전 컨텍스트 복원 (68% 메모리 개선) | Critical |
| C1-03 | AskUserQuestion | 세션 시작 시 | 4가지 옵션 질문 표시 | High |
| C1-04 | 자동 트리거 테이블 | 세션 시작 시 | 8개 언어 트리거 테이블 표시 | Medium |

### C.2 PreToolUse Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C2-01 | Write 권한 검사 | 소스 파일 Write | PDCA 가이드 표시 | High |
| C2-02 | Edit 권한 검사 | 소스 파일 Edit | 컨벤션 힌트 표시 | High |
| C2-03 | Bash 안전 검사 (Phase 9) | `kubectl delete` | 차단 메시지 | Critical |
| C2-04 | Bash 안전 검사 (QA) | `rm -rf /` | 차단 메시지 | Critical |
| C2-05 | Bash 샌드박스 (v2.1.31) | 일반 bash 명령 | "Read-only" 오류 없음 | Critical |

### C.3 PostToolUse Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C3-01 | Write 후 PDCA 가이드 | 소스 파일 Write 완료 | Gap 분석 제안 | High |
| C3-02 | Write 후 컴포넌트 추적 | components/ 파일 Write | Phase 5 추적 기록 | Medium |
| C3-03 | Bash 후 QA 추적 | docker/curl 명령 | QA 로그 기록 | Medium |
| C3-04 | Skill 후 다음 단계 | Skill 완료 | 다음 Skill/Agent 제안 | High |

### C.4 Stop Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C4-01 | PDCA Skill Stop | /pdca plan 완료 | Phase 전환, Task 생성 | Critical |
| C4-02 | Gap Detector Stop | gap-detector 완료 | Check→Act 또는 Check→Report | Critical |
| C4-03 | Iterator Stop | pdca-iterator 완료 | 재분석 제안 | High |
| C4-04 | Code Review Stop | code-review 완료 | 다음 Phase 제안 | Medium |

### C.5 UserPromptSubmit Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C5-01 | 신규 기능 감지 | "새 기능 추가" | /pdca plan 제안 | High |
| C5-02 | Agent 트리거 | "검증해줘" | gap-detector 제안 | High |
| C5-03 | Skill 트리거 | "static site" | starter 제안 | Medium |
| C5-04 | 모호성 감지 | 모호한 요청 | 명확화 질문 생성 | Medium |

### C.6 PreCompact Hook

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| C6-01 | 컨텍스트 압축 | 자동 압축 트리거 | PDCA 스냅샷 저장 | High |
| C6-02 | 스냅샷 정리 | 10개 초과 스냅샷 | 오래된 것 자동 삭제 | Medium |

---

## 8. Category D: Library Functions Test Cases (28 Cases)

### D.1 Core Modules (6 Cases)

| TC-ID | Module | Test Case | Expected Output | Priority |
|-------|--------|-----------|-----------------|----------|
| D1-01 | cache.js | TTL 캐싱 | 만료 시 null 반환 | Medium |
| D1-02 | config.js | bkit.config.json 로드 | 설정값 정상 반환 | High |
| D1-03 | debug.js | BKIT_DEBUG=true | 로그 파일 기록 | Medium |
| D1-04 | file.js | isSourceFile() | Tier 1-4 파일 감지 | High |
| D1-05 | io.js | parseHookInput() | toolName, filePath 추출 | High |
| D1-06 | platform.js | detectPlatform() | 'claude' 반환 | High |

### D.2 PDCA Modules (8 Cases)

| TC-ID | Module | Test Case | Expected Output | Priority |
|-------|--------|-----------|-----------------|----------|
| D2-01 | status.js | getPdcaStatusFull() | 전체 상태 반환 | Critical |
| D2-02 | status.js | updatePdcaStatus() | 상태 업데이트 성공 | Critical |
| D2-03 | phase.js | getNextPdcaPhase() | 다음 단계 반환 | High |
| D2-04 | phase.js | findDesignDoc() | 설계 문서 경로 | High |
| D2-05 | level.js | detectLevel() | Starter/Dynamic/Enterprise | High |
| D2-06 | tier.js | getLanguageTier() | Tier 1-4 반환 | Medium |
| D2-07 | automation.js | shouldAutoAdvance() | 자동 진행 여부 | High |
| D2-08 | automation.js | generateAutoTrigger() | 트리거 객체 생성 | High |

### D.3 Intent Modules (6 Cases)

| TC-ID | Module | Test Case | Expected Output | Priority |
|-------|--------|-----------|-----------------|----------|
| D3-01 | language.js | detectLanguage() | 8개 언어 감지 | High |
| D3-02 | language.js | matchMultiLangPattern() | 다국어 패턴 매칭 | High |
| D3-03 | trigger.js | matchImplicitAgentTrigger() | Agent + confidence | High |
| D3-04 | trigger.js | matchImplicitSkillTrigger() | Skill + level | High |
| D3-05 | ambiguity.js | calculateAmbiguityScore() | 0-1 점수 | Medium |
| D3-06 | ambiguity.js | generateClarifyingQuestions() | 질문 배열 | Medium |

### D.4 Task Modules (8 Cases)

| TC-ID | Module | Test Case | Expected Output | Priority |
|-------|--------|-----------|-----------------|----------|
| D4-01 | classification.js | classifyTask() | trivial/minor/feature/major | High |
| D4-02 | classification.js | getPdcaLevel() | none/light/standard/full | High |
| D4-03 | context.js | setActiveSkill() | 메모리 저장 성공 | High |
| D4-04 | context.js | getActiveAgent() | Agent 이름 반환 | High |
| D4-05 | creator.js | createPdcaTaskChain() | Task 체인 객체 | Critical |
| D4-06 | creator.js | autoCreatePdcaTask() | Task 생성 객체 | High |
| D4-07 | tracker.js | savePdcaTaskId() | Task ID 저장 | High |
| D4-08 | tracker.js | triggerNextPdcaAction() | 다음 액션 트리거 | High |

---

## 9. Category E: PDCA Workflow Test Cases (12 Cases)

### E.1 Full PDCA Cycle Test

| TC-ID | Test Case | Input Sequence | Expected Output | Priority |
|-------|-----------|----------------|-----------------|----------|
| E1-01 | Plan 시작 | `/pdca plan test-feature` | Plan 문서 생성, Task 생성 | Critical |
| E1-02 | Plan→Design 전환 | Plan 완료 | Design 단계 자동 제안 | Critical |
| E1-03 | Design 시작 | `/pdca design test-feature` | Design 문서 생성 | Critical |
| E1-04 | Design→Do 전환 | Design 완료 | 구현 시작 안내 | High |
| E1-05 | Do 단계 | 코드 구현 | Write Hook 가이드 | High |
| E1-06 | Do→Check 전환 | 구현 완료 | Analyze 제안 | High |
| E1-07 | Check (분석) | `/pdca analyze test-feature` | gap-detector 실행 | Critical |
| E1-08 | Check≥90%→Report | Match Rate >= 90% | Report 제안 | High |
| E1-09 | Check<90%→Act | Match Rate < 90% | Iterate 제안 | High |
| E1-10 | Act (개선) | `/pdca iterate test-feature` | 코드 자동 개선 | High |
| E1-11 | Act→Check 재분석 | 개선 완료 | 재분석 트리거 | High |
| E1-12 | Report 생성 | `/pdca report test-feature` | 완료 보고서 생성 | High |

---

## 10. Category F: v2.1.31 Specific Test Cases (15 Cases)

### F.1 PDF Handling (v2.1.30)

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| F1-01 | PDF pages 파라미터 | `Read(pdf_path, pages: "1-5")` | 특정 페이지만 읽기 | High |
| F1-02 | 대용량 PDF @mention | `@large-pdf.pdf` (>10p) | 경량 참조로 변환 | High |
| F1-03 | PDF 오류 시 락업 없음 | 너무 큰 PDF | 에러 메시지만, 세션 유지 (v2.1.31) | Critical |

### F.2 Bash Sandbox (v2.1.31)

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| F2-01 | 샌드박스 Bash 실행 | `ls -la` | 정상 출력, 오류 없음 | Critical |
| F2-02 | 파일 생성 Bash | `touch test.txt` | 정상 생성, "Read-only" 없음 | Critical |
| F2-03 | 디렉토리 생성 | `mkdir test-dir` | 정상 생성 | High |

### F.3 MCP Integration (v2.1.30)

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| F3-01 | 서브에이전트 MCP 접근 | Task로 Agent 호출 + MCP | MCP 도구 정상 접근 | Critical |
| F3-02 | MCP OAuth 설정 | `claude mcp add --client-id` | OAuth 인증 설정 | Medium |
| F3-03 | Atlassian MCP 접근 | Jira/Confluence 도구 | 정상 접근 | Medium |

### F.4 Task Tool Metrics (v2.1.30)

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| F4-01 | 토큰 메트릭 | Task 도구 호출 | token_count 반환 | High |
| F4-02 | 도구 사용 메트릭 | Task 도구 호출 | tool_uses 반환 | High |
| F4-03 | 시간 메트릭 | Task 도구 호출 | duration_ms 반환 | High |

### F.5 Other v2.1.31 Changes

| TC-ID | Test Case | Input | Expected Output | Priority |
|-------|-----------|-------|-----------------|----------|
| F5-01 | /debug 명령어 | `/debug` | 세션 디버그 정보 | Medium |
| F5-02 | 프롬프트 캐시 무효화 | Skill 메타데이터 변경 | 새 메타데이터 반영 | High |
| F5-03 | 시스템 프롬프트 | Bash 대신 전용 도구 | Read/Edit/Glob/Grep 권장 | High |

---

## 11. Category G: Multi-language Test Cases (8 Cases)

### G.1 Language Detection & Triggers

| TC-ID | Language | Trigger Input | Expected Agent/Skill | Priority |
|-------|----------|---------------|----------------------|----------|
| G1-01 | English | "verify implementation" | gap-detector | High |
| G1-02 | Korean | "검증해줘" | gap-detector | High |
| G1-03 | Japanese | "確認して" | gap-detector | Medium |
| G1-04 | Chinese | "验证一下" | gap-detector | Medium |
| G1-05 | Spanish | "verificar" | gap-detector | Medium |
| G1-06 | French | "vérifier" | gap-detector | Medium |
| G1-07 | German | "prüfen" | gap-detector | Medium |
| G1-08 | Italian | "verificare" | gap-detector | Medium |

---

## 12. Test Execution Plan

### 12.1 Test Phases

| Phase | Duration | Categories | Tester |
|-------|----------|------------|--------|
| Phase 1: Critical | 2h | E (PDCA), F1-F2 (PDF, Bash) | Manual |
| Phase 2: High | 3h | A1-A4 (Skills), B1-B5 (Agents) | Manual |
| Phase 3: Medium | 2h | C (Hooks), D (Library) | Manual |
| Phase 4: Low | 1h | G (Multi-lang), Remaining | Manual |

### 12.2 Test Execution Checklist

```markdown
## Pre-Test
- [ ] Claude Code v2.1.31 설치 확인
- [ ] bkit v1.5.0 플러그인 활성화 확인
- [ ] 테스트 프로젝트 준비
- [ ] PDCA 상태 초기화

## Critical Tests (Phase 1)
- [ ] E1-01 ~ E1-12: PDCA 전체 사이클
- [ ] F1-03: PDF 락업 없음
- [ ] F2-01 ~ F2-03: Bash 샌드박스
- [ ] F3-01: 서브에이전트 MCP

## High Priority Tests (Phase 2)
- [ ] A1-01 ~ A8-02: Skills 테스트
- [ ] B1-01 ~ B11-02: Agents 테스트

## Medium Priority Tests (Phase 3)
- [ ] C1-01 ~ C6-02: Hooks 테스트
- [ ] D1-01 ~ D4-08: Library 테스트

## Low Priority Tests (Phase 4)
- [ ] G1-01 ~ G1-08: 다국어 테스트
```

---

## 13. Success Criteria

### 13.1 Definition of Done

- [ ] 모든 Critical 테스트 케이스 통과 (100%)
- [ ] High 테스트 케이스 통과 (95%+)
- [ ] Medium 테스트 케이스 통과 (90%+)
- [ ] v2.1.31 특정 테스트 전체 통과
- [ ] 회귀 버그 없음

### 13.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical Pass Rate | 100% | Critical TC 통과율 |
| Overall Pass Rate | 95%+ | 전체 TC 통과율 |
| Regression Bugs | 0 | 기존 기능 장애 |
| Performance | No degradation | Hook 실행 시간 |

---

## 14. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| MCP 서버 연결 실패 | Medium | Low | 로컬 Mock 서버 대체 |
| PDF 테스트 파일 부재 | Low | Medium | 샘플 PDF 생성 |
| 환경 차이 (OS별) | Medium | Low | Docker 테스트 환경 |
| v2.1.31 롤백 | High | Very Low | v2.1.29 백업 |

---

## 15. Test Report Template

```markdown
# bkit v1.5.0 + Claude Code v2.1.31 Test Report

## Summary
- Test Date: YYYY-MM-DD
- Tester: [Name]
- Duration: [Hours]

## Results

| Category | Total | Pass | Fail | Skip | Pass Rate |
|----------|-------|------|------|------|-----------|
| A. Skills | 63 | | | | |
| B. Agents | 33 | | | | |
| C. Hooks | 24 | | | | |
| D. Library | 28 | | | | |
| E. PDCA | 12 | | | | |
| F. v2.1.31 | 15 | | | | |
| G. Multi-lang | 8 | | | | |
| **Total** | **183** | | | | |

## Failed Tests
| TC-ID | Issue | Severity | Notes |
|-------|-------|----------|-------|

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Conclusion
[Overall assessment and go/no-go decision]
```

---

## 16. Next Steps

1. [ ] 테스트 계획서 리뷰 및 승인
2. [ ] 테스트 환경 구축
3. [ ] Phase 1 (Critical) 테스트 실행
4. [ ] 테스트 결과 분석 및 리포트
5. [ ] 필요시 bkit 수정 및 재테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-04 | Initial draft | bkit Team |

---

*Generated by bkit report-generator | 2026-02-04*
