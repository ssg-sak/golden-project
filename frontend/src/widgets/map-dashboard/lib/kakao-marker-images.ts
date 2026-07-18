import type { HospitalTier } from '../../../shared/types/hospital';

interface KakaoMarkerImage {
  src: string;
  size: { width: number; height: number };
  options: { offset: { x: number; y: number } };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hospitalMarkerSvg(fill: string, size: number, symbol: string, symbolColor: string): string {
  const fontSize = size >= 34 ? 16 : size >= 28 ? 13 : 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${fill}" stroke="#fff" stroke-width="2"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="${symbolColor}" font-size="${fontSize}" font-weight="700" font-family="system-ui,sans-serif">${symbol}</text>
  </svg>`;
}

const TIER_MARKER: Record<HospitalTier, { fill: string; symbol: string; symbolColor: string; size: number }> = {
  1: { fill: '#d32f2f', symbol: '+', symbolColor: '#ffffff', size: 36 },
  2: { fill: '#1e88e5', symbol: '+', symbolColor: '#ffffff', size: 28 },
  3: { fill: '#ffc107', symbol: '★', symbolColor: '#f57f17', size: 30 },
};

export function markerImageForBedReportStatus(
  status: 'reported-bed-positive' | 'reported-bed-zero' | 'unknown',
  isSelected: boolean,
): KakaoMarkerImage {
  const fill =
    status === 'reported-bed-positive'
      ? '#16a34a'
      : status === 'reported-bed-zero'
        ? '#dc2626'
        : '#94a3b8';
  const size = isSelected ? 38 : 30;
  const src = svgDataUrl(
    hospitalMarkerSvg(fill, size, '+', '#ffffff'),
  );

  return {
    src,
    size: { width: size, height: size },
    options: { offset: { x: size / 2, y: size / 2 } },
  };
}

export function markerImageForTier(tier: HospitalTier): KakaoMarkerImage {
  const spec = TIER_MARKER[tier];
  const src = svgDataUrl(
    hospitalMarkerSvg(spec.fill, spec.size, spec.symbol, spec.symbolColor),
  );

  return {
    src,
    size: { width: spec.size, height: spec.size },
    options: { offset: { x: spec.size / 2, y: spec.size / 2 } },
  };
}

const USER_LOCATION_SIZE = 32;

export function userLocationMarkerImage(): KakaoMarkerImage {
  const src = svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${USER_LOCATION_SIZE}" height="${USER_LOCATION_SIZE}" viewBox="0 0 ${USER_LOCATION_SIZE} ${USER_LOCATION_SIZE}">
      <circle cx="16" cy="16" r="12" fill="rgba(59,130,246,0.25)"/>
      <circle cx="16" cy="16" r="7" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
    </svg>`,
  );

  return {
    src,
    size: { width: USER_LOCATION_SIZE, height: USER_LOCATION_SIZE },
    options: { offset: { x: USER_LOCATION_SIZE / 2, y: USER_LOCATION_SIZE / 2 } },
  };
}
