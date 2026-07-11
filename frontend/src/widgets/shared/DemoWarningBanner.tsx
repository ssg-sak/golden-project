export function DemoWarningBanner() {
  if (import.meta.env.MODE !== 'demo') {
    return null;
  }

  return (
    <div className="bg-amber-600 px-4 py-2 text-center text-xs font-bold text-white shadow-sm sm:text-sm">
      <span className="mr-2" aria-hidden="true">
        ⚠️
      </span>
      이 사이트는 대구 골든타임 프로젝트의 데모 테스트용 페이지입니다. 실제 응급·위급 상황 발생 시 반드시{' '}
      <span className="underline underline-offset-2">119</span> 또는{' '}
      <span className="underline underline-offset-2">1339</span>로 전화해 주세요.
    </div>
  );
}
