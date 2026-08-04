import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isSafeBundleUrl,
  startPolicyReleasePolling,
  usePolicyReleaseStore,
  validateRelease,
  type PolicyReleaseBundle,
} from '../../../frontend/src/shared/store/policyReleaseStore';

const originalRefreshLatest = usePolicyReleaseStore.getState().refreshLatest;

afterEach(() => {
  usePolicyReleaseStore.setState({ refreshLatest: originalRefreshLatest });
  vi.unstubAllGlobals();
});

describe('정책 분석 버전 포인터', () => {
  it('프로젝트 내부의 버전별 분석 파일만 허용한다', () => {
    expect(isSafeBundleUrl('data/releases/2026-07-r1/policy_release.json')).toBe(true);
    expect(isSafeBundleUrl('https://example.com/policy_release.json')).toBe(false);
    expect(isSafeBundleUrl('data/releases/../policy_release.json')).toBe(false);
    expect(isSafeBundleUrl('data/policy_release.json')).toBe(false);
  });

  it('앱 시작과 동시에 최신 정책 기준본을 확인한다', () => {
    const refreshLatest = vi.fn().mockResolvedValue(undefined);
    const setInterval = vi.fn().mockReturnValue(7);
    const clearInterval = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    usePolicyReleaseStore.setState({ refreshLatest });
    vi.stubGlobal('window', {
      setInterval,
      clearInterval,
      addEventListener,
      removeEventListener,
    });

    const stop = startPolicyReleasePolling(1234);

    expect(refreshLatest).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1234);
    expect(addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));

    stop();
    expect(clearInterval).toHaveBeenCalledWith(7);
    expect(removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });

  it('현재 7월 정책 기준본의 구조와 연결 관계가 유효하다', () => {
    const releasePath = fileURLToPath(
      new URL('../../../data/processed/policy_release.json', import.meta.url),
    );
    const release = JSON.parse(readFileSync(releasePath, 'utf8')) as PolicyReleaseBundle;

    expect(() => validateRelease(release)).not.toThrow();
    expect(release.metadata.population_base_month).toBe('2026.07');
  });
});
