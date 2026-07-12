import type { HospitalRecord } from '../../shared/types/hospital';
import { hospitalTierBadge } from '../../shared/types/hospital';
import { calculateInfrastructureMetrics } from './lib/hospital-infrastructure-score';
import { EmergencyEquipmentGuide } from './EmergencyEquipmentGuide';

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

function polygonPoints(values: Array<number | null>, radius = 37): string {
  const angleStep = (Math.PI * 2) / values.length;
  return values.map((value, index) => {
    const scaledRadius = (clampScore(value ?? 0) / 100) * radius;
    const angle = index * angleStep;
    return `${50 + scaledRadius * Math.sin(angle)},${50 - scaledRadius * Math.cos(angle)}`;
  }).join(' ');
}

function metricPoint(value: number, index: number, length: number, radius = 37) {
  const angle = index * ((Math.PI * 2) / length);
  const scaledRadius = (clampScore(value) / 100) * radius;
  return { x: 50 + scaledRadius * Math.sin(angle), y: 50 - scaledRadius * Math.cos(angle) };
}

export function HospitalRadarChart({ hospital }: { hospital: HospitalRecord }) {
  const metrics = calculateInfrastructureMetrics(hospital);
  const values = metrics.map(({ value }) => value);
  const knownValues = values.filter((value): value is number => value !== null);
  const overallScore = knownValues.length >= 2
    ? Math.round(knownValues.reduce((sum, value) => sum + value, 0) / knownValues.length)
    : null;
  const labelPositions = [
    { x: 50, y: 7, anchor: 'middle' as const },
    { x: 96, y: 52, anchor: 'end' as const },
    { x: 50, y: 98, anchor: 'middle' as const },
    { x: 4, y: 52, anchor: 'start' as const },
  ];

  return (
    <section className="relative shrink-0 overflow-hidden rounded-2xl border border-blue-200 bg-[#f7fafc] p-4 text-slate-800 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-800 via-teal-700 to-blue-800" />
      <div className="relative flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-lg font-black text-white" aria-hidden>+</span>
          <div>
            <p className="text-sm font-extrabold text-blue-950">의료자원 행정 비교표</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              신고 인프라와 현재 병상 여력을 항목별로 확인하는 정책 참고자료
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800 ring-1 ring-blue-200">
            {hospitalTierBadge(hospital.tier)}
          </span>
          <p className="mt-1 text-lg font-black text-blue-950">{overallScore === null ? '산정 보류' : `${overallScore}점`}</p>
        </div>
      </div>

      <div className="relative mt-3 flex justify-center">
        <svg viewBox="0 0 100 100" className="h-48 w-48" role="img" aria-label="의료자원 행정 비교 방사형 도표">
          {[100, 75, 50, 25].map((level) => (
            <polygon key={level} points={polygonPoints(metrics.map(() => level))} fill="none" stroke="#cbd5e1" strokeWidth="0.6" />
          ))}
          {labelPositions.map((position, index) => (
            <line key={metrics[index].label} x1="50" y1="50" x2={position.x} y2={position.y} stroke="#cbd5e1" strokeWidth="0.5" />
          ))}
          <polygon points={polygonPoints(values)} fill="rgba(13,148,136,0.16)" stroke="#0f766e" strokeWidth="1.4" />
          {values.map((value, index) => {
            if (value === null) return null;
            const point = metricPoint(value, index, values.length);
            return <circle key={metrics[index].label} cx={point.x} cy={point.y} r="1.7" fill="#1d4ed8" />;
          })}
          {metrics.map((metric, index) => (
            <text key={metric.label} x={labelPositions[index].x} y={labelPositions[index].y} textAnchor={labelPositions[index].anchor} fontSize="3.7" fontWeight="700" fill="#334155">
              {metric.label}
            </text>
          ))}
        </svg>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[10px] font-bold text-slate-600">{metric.label}</dt>
              <dd className={`text-xs font-black ${metric.value === null ? 'text-slate-400' : 'text-blue-900'}`}>
                {metric.value === null ? '미제공' : `${Math.round(metric.value)}점`}
              </dd>
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </dl>

      <details className="mt-3 rounded-lg border border-blue-200 bg-blue-50/70 text-[10px] text-slate-600">
        <summary className="cursor-pointer px-3 py-2 font-bold text-blue-950">지표 산정 기준과 행정적 해석</summary>
        <div className="space-y-2 border-t border-blue-200 px-3 py-3 leading-relaxed">
          <p><strong>의료인력 기반</strong> · 기관 역할별 참고 규모(Tier 1 400명, Tier 2 100명, Tier 3 30명) 대비 등록 의사 수</p>
          <p><strong>핵심장비 확인</strong> · 심평원에서 확인된 장비 항목 중 보유 항목 비율</p>
          <p><strong>일반응급실 여력</strong> · 국립중앙의료원 응급실일반 가용/전체 병상 비율</p>
          <p><strong>특수병상 대응</strong> · 분만실·음압·일반·코호트 격리 중 값이 제공된 유형의 현재 가용 비율</p>
          <p className="border-t border-blue-200 pt-2 text-slate-500">기관 등급은 점수가 아니라 의료체계상 역할이므로 종합점수에서 제외했습니다. 미제공 항목도 0점으로 간주하지 않습니다.</p>
        </div>
      </details>

      <EmergencyEquipmentGuide variant="admin" />

      <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
        이 값은 병원 품질 순위가 아니라 의료자원 배분과 공백 영역 검토를 위한 행정 참고지표입니다.
      </p>
    </section>
  );
}
