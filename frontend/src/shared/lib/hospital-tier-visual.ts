import type { HospitalTier } from '../types/hospital';

export interface HospitalTierVisual {
  tier: HospitalTier;
  /** 화면에 표시되는 병원 분류명 */
  label: string;
  /** 필터와 범례에 쓰이는 짧은 설명 */
  description: string;
  /** 지도 마커와 목록 아이콘에 쓰이는 글리프 */
  glyph: string;
  chipClass: string;
  chipTextClass: string;
  iconBgClass: string;
  iconTextClass: string;
  gradientClass: string;
  ringClass: string;
  filterActiveClass: string;
  panelHeaderClass: string;
  markerBorderClass: string;
  markerRingClass: string;
  markerActiveRingClass: string;
}

export const HOSPITAL_TIER_VISUAL: Record<HospitalTier, HospitalTierVisual> = {
  1: {
    tier: 1,
    label: '권역·지역 응급센터',
    description: '권역응급의료센터 2개와 지역응급의료센터 4개를 묶은 정책 분석 그룹',
    glyph: '+',
    chipClass: 'bg-rose-50 ring-rose-100',
    chipTextClass: 'text-rose-700',
    iconBgClass: 'bg-red-600',
    iconTextClass: 'text-white',
    gradientClass: 'from-rose-500 to-red-600',
    ringClass: 'ring-rose-100',
    filterActiveClass:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-300/40 ring-rose-300',
    panelHeaderClass: 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50',
    markerBorderClass: 'border-red-500',
    markerRingClass: 'ring-red-200',
    markerActiveRingClass: 'ring-red-500',
  },
  2: {
    tier: 2,
    label: '지역응급의료기관',
    description: '지역 단위 응급의료 접근성을 비교하는 공식 기관 유형',
    glyph: '+',
    chipClass: 'bg-sky-50 ring-sky-100',
    chipTextClass: 'text-sky-700',
    iconBgClass: 'bg-blue-600',
    iconTextClass: 'text-white',
    gradientClass: 'from-sky-500 to-blue-600',
    ringClass: 'ring-sky-100',
    filterActiveClass:
      'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-300/40 ring-sky-300',
    panelHeaderClass: 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50',
    markerBorderClass: 'border-blue-500',
    markerRingClass: 'ring-blue-200',
    markerActiveRingClass: 'ring-blue-500',
  },
  3: {
    tier: 3,
    label: '소아 야간·휴일',
    description: '달빛어린이병원 등 야간·휴일 소아진료 자원',
    glyph: '소',
    chipClass: 'bg-amber-50 ring-amber-100',
    chipTextClass: 'text-amber-800',
    iconBgClass: 'bg-amber-400',
    iconTextClass: 'text-amber-950',
    gradientClass: 'from-amber-400 to-orange-500',
    ringClass: 'ring-amber-100',
    filterActiveClass:
      'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-300/40 ring-amber-300',
    panelHeaderClass: 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    markerBorderClass: 'border-amber-400',
    markerRingClass: 'ring-amber-200',
    markerActiveRingClass: 'ring-amber-500',
  },
};

export const HOSPITAL_TIER_ORDER: HospitalTier[] = [1, 2, 3];

export function hospitalTierLabel(tier: HospitalTier): string {
  return HOSPITAL_TIER_VISUAL[tier].label;
}

/** 원천의 개별 공식 유형명을 대체하지 않는, 화면 분류의 근거 설명. */
export function hospitalTierBasisLabel(tier: HospitalTier): string {
  if (tier === 1) return '권역·지역 응급센터 분류 기반';
  if (tier === 2) return '지역응급의료기관 분류 기반';
  return '달빛어린이병원 지정 자원';
}

const REGIONAL_CENTER_NAMES = new Set([
  '경북대학교병원',
  '영남대학교병원',
]);

const LOCAL_CENTER_NAMES = new Set([
  '계명대학교 동산병원',
  '대구파티마병원',
  '대구가톨릭대학교병원',
  '칠곡경북대학교병원',
]);

/** 저장소의 기관명으로 확인 가능한 공식 기관 유형을 표시한다. */
export function hospitalOfficialTypeLabel(name: string, tier: HospitalTier): string {
  if (REGIONAL_CENTER_NAMES.has(name)) return '권역응급의료센터';
  if (LOCAL_CENTER_NAMES.has(name)) return '지역응급의료센터';
  if (tier === 2) return '지역응급의료기관';
  if (tier === 3) return '달빛어린이병원';
  return '응급기관 유형 확인 필요';
}
