import { describe, expect, it } from 'vitest';

import {
  clampPolicyRiskThreshold,
  resolvePolicyRiskThreshold,
} from '../../../frontend/src/shared/lib/policy-risk-threshold';

describe('정책 위험 경계 출처 우선순위', () => {
  it('정책 릴리스와 운영 요약이 다르면 정책 릴리스 값을 사용한다', () => {
    expect(resolvePolicyRiskThreshold(13429.72, 749.83)).toBe(13429.72);
  });

  it('정책 릴리스를 아직 읽지 못한 동안만 운영 요약값을 사용한다', () => {
    expect(resolvePolicyRiskThreshold(undefined, 749.83)).toBe(749.83);
  });

  it('정적 공개 빌드의 초기값은 릴리스 기본값 적용 전에 최소값으로 덮지 않는다', () => {
    expect(clampPolicyRiskThreshold(0, 749.83, 54858.43, false)).toBe(0);
  });

  it('사용자가 조정한 정적 경계값만 데이터 범위 안으로 보정한다', () => {
    expect(clampPolicyRiskThreshold(100, 749.83, 54858.43, false)).toBe(749.83);
    expect(clampPolicyRiskThreshold(60000, 749.83, 54858.43, false)).toBe(54858.43);
  });
});
