import { describe, expect, it } from 'vitest';

import {
  buildMobileHospitalDetailHistoryState,
  isMobileHospitalDetailHistoryState,
  MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG,
} from '../../../frontend/src/shared/hooks/useMobileHospitalDetailHistory';

describe('mobile hospital detail history helpers', () => {
  it('recognizes detail history state', () => {
    expect(isMobileHospitalDetailHistoryState(buildMobileHospitalDetailHistoryState('경북대'))).toBe(
      true,
    );
  });

  it('rejects unrelated history state', () => {
    expect(isMobileHospitalDetailHistoryState(null)).toBe(false);
    expect(isMobileHospitalDetailHistoryState({})).toBe(false);
    expect(
      isMobileHospitalDetailHistoryState({ [MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG]: false }),
    ).toBe(false);
  });

  it('builds a stable payload for pushState', () => {
    expect(buildMobileHospitalDetailHistoryState('영남대')).toEqual({
      [MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG]: true,
      hospitalName: '영남대',
    });
  });
});
