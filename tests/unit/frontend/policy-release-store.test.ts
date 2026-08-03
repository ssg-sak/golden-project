import { describe, expect, it } from 'vitest';

import { isSafeBundleUrl } from '../../../frontend/src/shared/store/policyReleaseStore';


describe('정책 분석 버전 포인터', () => {
  it('프로젝트 내부의 버전별 분석 파일만 허용한다', () => {
    expect(isSafeBundleUrl('data/releases/2026-07-r1/policy_release.json')).toBe(true);
    expect(isSafeBundleUrl('https://example.com/policy_release.json')).toBe(false);
    expect(isSafeBundleUrl('data/releases/../policy_release.json')).toBe(false);
    expect(isSafeBundleUrl('data/policy_release.json')).toBe(false);
  });
});
