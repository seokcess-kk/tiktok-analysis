# Plan Document: hidden-features-fix

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | hidden-features-fix |
| **작성일** | 2026-02-11 |
| **작성자** | Claude Opus 4.5 |
| **레벨** | Dynamic |
| **우선순위** | High |

---

## 문제 정의

구현되어 있지만 UI에 노출되지 않거나, 링크는 있지만 페이지가 없는 기능들을 발견함.

---

## 수정 범위

### Phase 1: Header 버튼 수정 (즉시)

#### 1.1 NotificationBell 컴포넌트 연결
- **현재**: Header에 정적 Bell 버튼 (하드코딩 "3")
- **수정**: NotificationBell 컴포넌트로 교체
- **파일**: `src/components/layout/header.tsx`

#### 1.2 Settings 메뉴 클릭 핸들러 추가
- **현재**: onClick 핸들러 없음
- **수정**: `/settings` 또는 모달로 이동
- **파일**: `src/components/layout/header.tsx`

### Phase 2: Insights 페이지 핸들러 구현

#### 2.1 읽음 표시 구현
- **현재**: `console.log('Mark as read:', id)`
- **수정**: API 호출하여 실제 읽음 상태 업데이트
- **파일**: `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx`

#### 2.2 이상 징후 해제 구현
- **현재**: `console.log('Dismiss:', i)`
- **수정**: 실제 dismiss 로직 구현
- **파일**: `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx`

### Phase 3: 미구현 페이지 생성

#### 3.1 Settings 페이지
- **경로**: `/settings`
- **내용**: 기본 설정 페이지 (프로필, 알림 설정 등)

#### 3.2 Notifications 페이지
- **경로**: `/notifications`
- **내용**: 전체 알림 목록 (API 이미 구현됨)

### Phase 4: Command Menu 링크 정리

- 존재하지 않는 페이지 링크 제거 또는 비활성화
- `/clients`, `/accounts/{id}/campaigns`, `/accounts/{id}/settings`

---

## 구현 순서

1. [x] Header NotificationBell 연결
2. [x] Header Settings 핸들러 추가
3. [x] Insights 읽음 표시 구현
4. [x] Insights 해제 구현
5. [x] Settings 페이지 생성
6. [x] Notifications 페이지 생성
7. [x] Command Menu 정리

---

## 예상 작업량

- Phase 1: 10분
- Phase 2: 15분
- Phase 3: 30분
- Phase 4: 10분
- **총**: 약 1시간

---

## 체크리스트

- [x] Header 알림 버튼 동작 (NotificationBell 연결)
- [x] Header 설정 메뉴 클릭 가능 (router.push 추가)
- [x] Insights 읽음 표시 동작 (API 호출 구현)
- [x] Insights 해제 동작 (로컬 상태 제거)
- [x] /settings 페이지 접근 가능 (페이지 생성)
- [x] /notifications 페이지 접근 가능 (페이지 생성)
- [x] Command Menu 링크 모두 유효 (미구현 링크 제거)
