import type { HospitalRecord } from '../../shared/types/hospital';
import {
  calculateInfrastructureMetrics,
  hasSufficientInfrastructureData,
} from './lib/hospital-infrastructure-score';

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

function polygonPoints(values: number[], radius = 38): string {
  const angleStep = (Math.PI * 2) / values.length;
  return values
    .map((value, index) => {
      const scaledRadius = (clampScore(value) / 100) * radius;
      const x = 50 + scaledRadius * Math.sin(index * angleStep);
      const y = 50 - scaledRadius * Math.cos(index * angleStep);
      return `${x},${y}`;
    })
    .join(' ');
}

function metricPoint(value: number, index: number, length: number, radius = 38) {
  const angle = index * ((Math.PI * 2) / length);
  const scaledRadius = (clampScore(value) / 100) * radius;
  return {
    x: 50 + scaledRadius * Math.sin(angle),
    y: 50 - scaledRadius * Math.cos(angle),
  };
}

export function HospitalRadarChart({ hospital }: { hospital: HospitalRecord }) {
  if (!hasSufficientInfrastructureData(hospital)) {
    return (
      <section className="shrink-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="text-sm font-bold text-slate-800">의료 인프라 분석</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          의료진·장비·병상 정보가 모이면 지역 의료자원 규모를 비교할 수 있어요. 현재는 일부 정보를 확인하고 있습니다.
        </p>
        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
          데이터 확인 중
        </span>
      </section>
    );
  }

  const metrics = calculateInfrastructureMetrics(hospital);
  const values = metrics.map(({ value }) => value);
  const overallScore = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const gridLevels = [100, 75, 50, 25];
  const labelPositions = [
    { x: 50, y: 7, anchor: 'middle' as const },
    { x: 94, y: 52, anchor: 'end' as const },
    { x: 50, y: 98, anchor: 'middle' as const },
    { x: 6, y: 52, anchor: 'start' as const },
  ];

  return (
    <section
      className="relative shrink-0 overflow-hidden rounded-2xl bg-slate-950 p-4 text-white ring-1 ring-indigo-400/30 shadow-xl"
      style={{ minHeight: '352px', flexShrink: 0 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.2),transparent_44%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-200">의료 인프라 비교 지표</p>
          <p className="mt-1 text-[10px] text-slate-400">지역별 의료자원 분포와 부족 영역을 비교하는 참고 자료</p>
        </div>
        <span className="rounded-lg bg-indigo-400/15 px-2 py-1 text-sm font-black text-indigo-200 ring-1 ring-indigo-300/25">
          {overallScore}<span className="text-[9px] font-semibold text-slate-400"> / 100</span>
        </span>
      </div>

      <div className="relative mt-2 flex justify-center" style={{ minHeight: '192px' }}>
        <svg viewBox="0 0 100 100" className="h-48 w-48" style={{ width: '192px', height: '192px', flex: '0 0 192px' }} role="img" aria-label={`의료 인프라 종합 점수 ${overallScore}점`}>
          {gridLevels.map((level) => (
            <polygon key={level} points={polygonPoints(metrics.map(() => level))} fill="none" stroke="#334155" strokeWidth="0.6" />
          ))}
          {labelPositions.map((position, index) => (
            <line key={metrics[index].label} x1="50" y1="50" x2={position.x} y2={position.y} stroke="#334155" strokeWidth="0.5" />
          ))}
          <polygon points={polygonPoints(values)} fill="rgba(56,189,248,0.24)" stroke="#67e8f9" strokeWidth="1.4" className="transition-all duration-700" />
          {values.map((value, index) => {
            const { x, y } = metricPoint(value, index, values.length);
            return <circle key={metrics[index].label} cx={x} cy={y} r="1.5" fill="#a7f3d0" />;
          })}
          {metrics.map((metric, index) => (
            <text key={metric.label} x={labelPositions[index].x} y={labelPositions[index].y} textAnchor={labelPositions[index].anchor} fontSize="4" fill="#cbd5e1">
              {metric.label}
            </text>
          ))}
        </svg>
      </div>

      <dl className="relative grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
            <dt className="text-[10px] text-slate-400">{metric.label}</dt>
            <dd className="text-xs font-bold text-slate-100">{Math.round(metric.value)}점</dd>
          </div>
        ))}
      </dl>
      <details className="relative mt-3 rounded-lg bg-white/5 text-[10px] text-slate-300 ring-1 ring-white/10">
        <summary className="cursor-pointer px-3 py-2 font-bold text-slate-200">지표 계산 기준 보기</summary>
        <div className="space-y-2 border-t border-white/10 px-3 py-3 leading-relaxed">
          <p><strong className="text-cyan-200">의료진</strong> · 심평원 등록 의료진 50명을 100점 상한으로 환산</p>
          <p><strong className="text-cyan-200">장비</strong> · 심평원 조회 장비 중 보유 장비의 비율</p>
          <p><strong className="text-cyan-200">수용력</strong> · 현재 가용 응급 병상 20개를 100점 상한으로 환산</p>
          <p><strong className="text-cyan-200">기관 등급</strong> · 서비스 분류 기준 Tier 1=100점, Tier 2=70점</p>
          <p className="border-t border-white/10 pt-2 text-slate-400">종합점수는 네 지표의 단순 평균입니다. 50명·20개 상한과 등급 점수는 지역 비교를 위한 초기 기준이며 심평원 공식 산식이 아닙니다.</p>
        </div>
      </details>
      <p className="relative mt-3 text-[9px] leading-relaxed text-slate-400">의료자원 규모를 비교하는 참고 지표입니다. 다른 지역·수용 지표와 함께 비교해 주세요.</p>
    </section>
  );
}
