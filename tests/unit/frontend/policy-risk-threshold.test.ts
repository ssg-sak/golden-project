import { describe, expect, it } from 'vitest';

import { resolvePolicyRiskThreshold } from '../../../frontend/src/shared/lib/policy-risk-threshold';

describe('정책 위험 경계 출처 우선순위', () => {
  it('정책 릴리스와 운영 요약이 다르면 정책 릴리스 값을 사용한다', () => {
    expect(resolvePolicyRiskThreshold(13429.72, 749.83)).toBe(13429.72);
  });

  it('정책 릴리스를 아직 읽지 못한 동안만 운영 요약값을 사용한다', () => {
    expect(resolvePolicyRiskThreshold(undefined, 749.83)).toBe(749.83);
  });
});
