# TikTok Marketing API 승인 신청 체크리스트

> **최종 업데이트**: 2026-02-10

---

## Phase 1: 사전 준비 ✅

### 계정 준비
- [ ] TikTok 개인 계정 생성
- [ ] TikTok for Developers 계정 등록
- [ ] 이메일 인증 완료
- [ ] 개발자 프로필 작성

### 비즈니스 서류
- [ ] 사업자등록증 (PDF, 최근 발급)
- [ ] 회사 소개서 또는 포트폴리오
- [ ] 광고대행사 인증서 (해당 시)

### 기술 준비
- [ ] 도메인 확보 (예: yourdomain.com)
- [ ] SSL 인증서 설치 (HTTPS)
- [ ] OAuth Redirect URI 준비
  ```
  https://yourdomain.com/api/auth/callback/tiktok
  ```

---

## Phase 2: 문서 작성 ✅

### 필수 문서
- [x] 앱 설명 (Use Case Description)
  - 📄 `APPLICATION-GUIDE.md` 섹션 3 참조
- [x] 데이터 활용 정책
  - 📄 `DATA-USAGE-POLICY.md`
- [x] 보안 정책
  - 📄 `SECURITY-POLICY.md`

### 웹사이트 필수 페이지
- [ ] 개인정보처리방침 페이지
- [ ] 서비스 이용약관 페이지
- [ ] 회사 소개 페이지

---

## Phase 3: 앱 등록 📝

### TikTok Developer Portal 작업
1. [ ] 앱 생성 (Create App)
2. [ ] 기본 정보 입력
   - [ ] App Name
   - [ ] App Icon (512x512 PNG)
   - [ ] App Description
3. [ ] 플랫폼 설정
   - [ ] Web 플랫폼 선택
   - [ ] Redirect URI 입력
   - [ ] Terms of Service URL
   - [ ] Privacy Policy URL
4. [ ] Products 추가
   - [ ] Marketing API 선택
5. [ ] Scopes 선택
   - [ ] `advertiser.info.read`
   - [ ] `campaign.read`
   - [ ] `adgroup.read`
   - [ ] `ad.read`
   - [ ] `creative.read`
   - [ ] `report.read`

---

## Phase 4: 심사 제출 📤

### 제출 전 최종 점검
- [ ] 모든 필수 필드 입력 확인
- [ ] 오탈자 검토
- [ ] URL 동작 확인
- [ ] 문서 일관성 검토

### 제출
- [ ] "Submit for Review" 클릭
- [ ] 제출 확인 이메일 수신
- [ ] 예상 심사 기간: 수일 ~ 2주

---

## Phase 5: 심사 후 조치 📋

### 승인된 경우
- [ ] 앱 상태 "Live" 확인
- [ ] App ID 기록: `__________________`
- [ ] App Secret 기록: `__________________`
- [ ] `.env` 파일 설정
- [ ] OAuth 플로우 테스트
- [ ] API 호출 테스트

### 거부된 경우
- [ ] Review Comments 확인
- [ ] 피드백 내용 기록
- [ ] 수정 사항 반영
- [ ] 재심사 요청

---

## 연락처 정보 (신청 시 필요)

```
회사명: ________________________
담당자: ________________________
이메일: ________________________
전화번호: ______________________
웹사이트: ______________________
```

---

## 참고 링크

| 리소스 | URL |
|--------|-----|
| Developer Portal | https://developers.tiktok.com/ |
| Marketing API Docs | https://business-api.tiktok.com/portal/docs |
| Developer Guidelines | https://developers.tiktok.com/doc/our-guidelines-developer-guidelines |
| App Review Guidelines | https://developers.tiktok.com/doc/app-review-guidelines |

---

## 진행 상태 추적

| 단계 | 상태 | 완료일 | 비고 |
|------|------|--------|------|
| 사전 준비 | ⏳ 진행 중 | | |
| 문서 작성 | ✅ 완료 | 2026-02-10 | |
| 앱 등록 | ⏳ 대기 | | |
| 심사 제출 | ⏳ 대기 | | |
| 심사 완료 | ⏳ 대기 | | |

---

*본 체크리스트를 따라 순차적으로 진행하세요.*
