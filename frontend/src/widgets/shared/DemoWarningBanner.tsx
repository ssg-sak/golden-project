export function DemoWarningBanner() {
  if (import.meta.env.MODE !== 'demo') {
    return null;
  }

  return (
    <div className="bg-slate-900 px-4 py-2 text-center text-xs font-bold text-white shadow-sm sm:text-sm">
      <span className="mr-2" aria-hidden="true">
        🧪
      </span>
      현재 페이지는 공식 운영 서비스가 아닌 <span className="text-amber-200">개발·검증용 데모</span>
      입니다. 기능과 데이터는 완성본이 아니며 실제 응급 안내 서비스로 사용하면 안 됩니다. 실제 응급·위급
      상황에서는 <span className="underline underline-offset-2">119</span> 또는{' '}
      <span className="underline underline-offset-2">1339</span>에 연락해 주세요.
    </div>
  );
}
