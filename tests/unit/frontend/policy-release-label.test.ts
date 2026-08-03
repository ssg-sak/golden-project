import { describe, expect, it } from 'vitest';

import { formatPolicyReleaseLabel } from '../../../frontend/src/shared/lib/policy-release-label';


describe('정책 분석본 쉬운 표기', () => {
  it('내부 r 표기를 차수로 풀어쓴다', () => {
    expect(
      formatPolicyReleaseLabel('2026-07-18T00:00:00+09:00', '2026-07-18-r2'),
    ).toBe('2026.07.18 2차 검증본');
  });

  it('날짜가 없으면 차수만 알기 쉽게 표시한다', () => {
    expect(formatPolicyReleaseLabel(undefined, '2026-07-r1')).toBe('1차 검증본');
  });

  it('내부 버전이 없으면 일반 안내를 표시한다', () => {
    expect(formatPolicyReleaseLabel()).toBe('검증된 분석본');
  });
});
