interface EmergencyEquipmentGuideProps {
  variant?: 'citizen' | 'admin';
}

const EQUIPMENT_DESCRIPTIONS = [
  ['CT', '외상·뇌출혈 등 신속한 단층 영상검사'],
  ['MRI', '뇌·신경·연부조직의 정밀 영상검사'],
  ['조영촬영기', '혈관 상태 확인과 응급 중재에 활용'],
  ['인공호흡기', '스스로 호흡하기 어려운 환자의 호흡 보조'],
] as const;

export function EmergencyEquipmentGuide({ variant = 'citizen' }: EmergencyEquipmentGuideProps) {
  return (
    <details className={`text-[10px] text-slate-600 ${variant === 'admin' ? 'mt-3 border border-slate-200 bg-white' : 'mt-2 border-t border-slate-200 pt-2'}`}>
      <summary className={`cursor-pointer font-bold ${variant === 'admin' ? 'px-3 py-2 text-blue-950' : 'text-teal-900'}`}>
        응급진료 핵심장비 4종 용도 알아보기
      </summary>
      <dl className={`grid gap-1.5 leading-relaxed ${variant === 'admin' ? 'border-t border-slate-200 px-3 py-3' : 'mt-2'}`}>
        {EQUIPMENT_DESCRIPTIONS.map(([name, description]) => (
          <div key={name}>
            <dt className="inline font-bold">{name}</dt>
            <dd className="inline"> · {description}</dd>
          </div>
        ))}
      </dl>
      <p className={`leading-relaxed text-slate-500 ${variant === 'admin' ? 'border-t border-slate-200 px-3 py-2' : 'mt-2'}`}>
        가용 표시는 장비 상태 참고값이며 특정 환자의 즉시 검사·치료 가능 여부를 보장하지 않습니다.
      </p>
    </details>
  );
}
