interface GovernanceFooterProps {
  variant?: 'default' | 'compact';
}

export function GovernanceFooter({ variant = 'default' }: GovernanceFooterProps) {
  const isCompact = variant === 'compact';

  return (
    <footer className="shrink-0 border-t-2 border-teal-800 bg-[#e7ecee]">
      <div
        className={`mx-auto w-full text-center ${
          isCompact ? 'max-w-none px-4 py-2 sm:px-6' : 'max-w-3xl px-4 py-6 sm:px-6'
        }`}
      >
        <p className={`leading-relaxed text-slate-700 ${isCompact ? 'text-[11px]' : 'text-sm'}`}>
          <span className="font-semibold text-slate-800">대구 골든타임</span>
          {' — '}
          <span className="font-semibold text-slate-800">국립중앙의료원</span> 실시간 응급 의료
          데이터 기반 응급의료 거버넌스 플랫폼입니다.
          {isCompact ? (
            <span className="text-slate-500">
              {' '}
              · 응급 시 119·1339 · 참고용 정보
            </span>
          ) : null}
        </p>
        {!isCompact ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            응급·위급 상황에서는 119 또는 응급의료 정보센터(1339)를 이용해 주세요. 본 화면의 정보는
            참고용이며, 실제 도로·교통 상황에 따라 달라질 수 있습니다.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
