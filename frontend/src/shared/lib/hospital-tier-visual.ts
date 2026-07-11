import type { HospitalTier } from '../types/hospital';

export interface HospitalTierVisual {
  tier: HospitalTier;
  /** 서비스 표시 명칭 — 중증 거점, 일반 응급, 달빛·소아 */
  label: string;
  /** 필터·범례용 짧은 설명 */
  description: string;
  /** 지도 마커·아이콘 글리프 (+ / ★) */
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
    label: '중증 거점',
    description: '중증 응급 수용 가능한 대형 거점',
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
    label: '일반 응급',
    description: '웹에 등록된 일반 응급 진료기관',
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
    label: '달빛·소아',
    description: '야간·휴일 소아 응급 지정',
    glyph: '★',
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
