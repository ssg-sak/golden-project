import { useCallback, useEffect, useRef } from 'react';

import type { HospitalRecord } from '../types/hospital';

export const MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG = 'mobileCitizenHospitalDetail' as const;

export type MobileHospitalDetailHistoryState = {
  [MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG]?: boolean;
  hospitalName?: string;
};

export function isMobileHospitalDetailHistoryState(
  state: unknown,
): state is MobileHospitalDetailHistoryState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as MobileHospitalDetailHistoryState)[MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG] === true
  );
}

export function buildMobileHospitalDetailHistoryState(
  hospitalName: string,
): MobileHospitalDetailHistoryState {
  return {
    [MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG]: true,
    hospitalName,
  };
}

/**
 * 모바일 병원 상세 진입을 브라우저 히스토리에 반영해
 * 안드로이드 물리 Back / 브라우저 Back이 목록으로 돌아가도록 한다.
 */
export function useMobileHospitalDetailHistory(
  selectedHospital: HospitalRecord | null,
  onHospitalSelect: (hospital: HospitalRecord | null) => void,
): { closeDetail: () => void } {
  const selectedRef = useRef(selectedHospital);
  const closedByPopStateRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selectedHospital;
  }, [selectedHospital]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!selectedHospital) return;
    if (isMobileHospitalDetailHistoryState(window.history.state)) return;

    window.history.pushState(
      buildMobileHospitalDetailHistoryState(selectedHospital.name),
      '',
    );
  }, [selectedHospital]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedHospital) return;
    if (closedByPopStateRef.current) {
      closedByPopStateRef.current = false;
      return;
    }
    if (!isMobileHospitalDetailHistoryState(window.history.state)) return;

    window.history.replaceState(
      {
        ...(window.history.state as object),
        [MOBILE_HOSPITAL_DETAIL_HISTORY_FLAG]: false,
      },
      '',
    );
  }, [selectedHospital]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = () => {
      if (!selectedRef.current) return;
      closedByPopStateRef.current = true;
      onHospitalSelect(null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [onHospitalSelect]);

  const closeDetail = useCallback(() => {
    if (typeof window !== 'undefined' && isMobileHospitalDetailHistoryState(window.history.state)) {
      window.history.back();
      return;
    }
    onHospitalSelect(null);
  }, [onHospitalSelect]);

  return { closeDetail };
}
