import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 이용약관 | TikTok Ads Analysis',
  description: 'TikTok Ads Analysis 서비스의 이용약관',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">서비스 이용약관</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            최종 수정일: 2026년 2월 10일
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
            <p className="text-gray-700">
              본 약관은 TikTok Ads Analysis(이하 &quot;서비스&quot;)의 이용과 관련하여
              서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (서비스의 내용)</h2>
            <p className="text-gray-700 mb-4">서비스는 다음과 같은 기능을 제공합니다:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>TikTok 광고 성과 데이터 수집 및 분석</li>
              <li>AI 기반 인사이트 및 최적화 전략 제안</li>
              <li>광고 소재(Creative) 성과 분석</li>
              <li>자동 리포트 생성 및 전달</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (이용자의 의무)</h2>
            <p className="text-gray-700 mb-4">이용자는 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>타인의 계정 정보를 무단으로 사용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>수집된 데이터를 허가 없이 제3자에게 공유하는 행위</li>
              <li>관련 법령 및 TikTok 정책을 위반하는 행위</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (서비스 이용 제한)</h2>
            <p className="text-gray-700">
              서비스 제공자는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을
              방해하는 경우, 사전 통지 없이 서비스 이용을 제한하거나 중단할 수 있습니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (면책조항)</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>서비스는 TikTok API를 통해 제공되는 데이터를 기반으로 하며,
                  데이터의 정확성을 완전히 보장하지 않습니다.</li>
              <li>AI 분석 결과 및 전략 제안은 참고용이며,
                  최종 의사결정은 이용자의 책임입니다.</li>
              <li>천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해
                  책임지지 않습니다.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (지적재산권)</h2>
            <p className="text-gray-700">
              서비스의 모든 콘텐츠, 기술, 디자인에 대한 지적재산권은 서비스 제공자에게
              귀속됩니다. 이용자는 서비스를 이용하여 얻은 정보를 서비스 제공자의
              사전 동의 없이 상업적 목적으로 이용할 수 없습니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (약관의 변경)</h2>
            <p className="text-gray-700">
              서비스 제공자는 필요한 경우 약관을 변경할 수 있으며,
              변경된 약관은 서비스 내 공지사항을 통해 7일 전에 고지합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (분쟁 해결)</h2>
            <p className="text-gray-700">
              본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결하며,
              관할 법원은 서비스 제공자의 본사 소재지 법원으로 합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (문의)</h2>
            <p className="text-gray-700">
              서비스 이용 관련 문의사항은 아래로 연락해 주시기 바랍니다.<br />
              이메일: support@example.com
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
