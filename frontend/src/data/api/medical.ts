import type { MockMedicalData } from '../../shared/types/medical';

import mockMedicalDataUrl from '../../assets/mock_medical_data.json?url';

export async function fetchMockMedicalData(): Promise<MockMedicalData> {
  const response = await fetch(mockMedicalDataUrl);

  if (!response.ok) {
    throw new Error(`의료 mock 데이터 로드 실패: ${response.status}`);
  }

  return response.json();
}
