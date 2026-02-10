import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | TikTok Ads Analysis',
  description: 'TikTok Ads Analysis 서비스의 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            최종 수정일: 2026년 2월 10일
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 수집하는 개인정보</h2>
            <p className="text-gray-700 mb-4">
              TikTok Ads Analysis(이하 &quot;서비스&quot;)는 다음과 같은 정보를 수집합니다:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>TikTok 계정 정보 (OAuth 인증을 통해 제공되는 정보)</li>
              <li>광고 계정 성과 데이터 (노출, 클릭, 전환 등)</li>
              <li>이메일 주소 (서비스 로그인 및 알림용)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 개인정보의 이용 목적</h2>
            <p className="text-gray-700 mb-4">
              수집된 정보는 다음 목적으로만 사용됩니다:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>광고 성과 분석 및 인사이트 제공</li>
              <li>AI 기반 최적화 전략 제안</li>
              <li>성과 리포트 생성 및 전달</li>
              <li>서비스 개선 및 기술 지원</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-gray-700">
              성과 데이터: 최대 24개월 보관 후 자동 삭제<br />
              계정 정보: 서비스 탈퇴 시 30일 이내 삭제<br />
              분석 결과: 12개월 보관
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-gray-700">
              서비스는 사용자의 명시적 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              단, AI 분석을 위해 익명화된 성과 데이터가 OpenAI API로 전송될 수 있습니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. 개인정보 보호 조치</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>모든 데이터 전송 시 TLS 1.3 암호화</li>
              <li>API 토큰 AES-256 암호화 저장</li>
              <li>클라이언트별 데이터 격리</li>
              <li>정기적인 보안 감사 실시</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. 이용자의 권리</h2>
            <p className="text-gray-700">
              이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제를 요청할 수 있습니다.
              요청은 서비스 내 설정 메뉴 또는 고객 지원을 통해 가능합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. 문의처</h2>
            <p className="text-gray-700">
              개인정보 관련 문의사항은 아래로 연락해 주시기 바랍니다.<br />
              이메일: privacy@example.com
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← 서비스로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
