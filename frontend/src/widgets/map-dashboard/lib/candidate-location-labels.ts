export type CandidateMode = 'pediatric' | 'senior';

const CANDIDATE_DISTRICTS: Record<CandidateMode, Record<number, string>> = {
  pediatric: {
    1: '서구 비산7동',
    2: '달성군 현풍읍',
    3: '동구 신암4동',
    4: '수성구 범어1동',
    5: '동구 도평동',
    6: '군위군 효령면',
  },
  senior: {
    1: '수성구 지산1동',
    2: '달성군 논공읍',
    3: '군위군 우보면',
  },
};

const CANDIDATE_LOCATIONS: Record<CandidateMode, Array<{ id: number; lat: number; lng: number }>> = {
  pediatric: [
    { id: 1, lat: 35.887682622, lng: 128.548218267 },
    { id: 2, lat: 35.705094431, lng: 128.431674535 },
    { id: 3, lat: 35.882777631, lng: 128.631817499 },
    { id: 4, lat: 35.848381544, lng: 128.630296647 },
    { id: 5, lat: 35.914346302, lng: 128.650791846 },
    { id: 6, lat: 36.212479694, lng: 128.617453798 },
  ],
  senior: [
    { id: 1, lat: 35.826276237, lng: 128.649295921 },
    { id: 2, lat: 35.749237386, lng: 128.470436813 },
    { id: 3, lat: 36.161736951, lng: 128.654469239 },
  ],
};

export function candidateDistrictLabel(mode: CandidateMode | undefined, id: number): string {
  if (!mode) return `후보 ${id}`;
  return CANDIDATE_DISTRICTS[mode]?.[id] ?? `후보 ${id}`;
}

export function candidateDistrictWithNumber(mode: CandidateMode | undefined, id: number): string {
  return `${candidateDistrictLabel(mode, id)} (${id}번)`;
}

export function formatCombinationDistrictLine(
  mode: CandidateMode | undefined,
  line: string,
): string {
  const [prefix, idsText] = line.split(':');
  if (!idsText) return line;

  const labels = idsText
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
    .map((id) => candidateDistrictWithNumber(mode, id));

  if (labels.length === 0) return line;
  return `${prefix.trim()}: ${labels.join(' / ')}`;
}

export function candidateDistrictFromCoordinates(
  mode: CandidateMode | undefined,
  lat: number,
  lng: number,
): string | null {
  if (!mode) return null;

  const match = CANDIDATE_LOCATIONS[mode].find((candidate) => {
    return Math.abs(candidate.lat - lat) < 0.000001 && Math.abs(candidate.lng - lng) < 0.000001;
  });

  return match ? candidateDistrictLabel(mode, match.id) : null;
}
