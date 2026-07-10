/** FastAPI 백엔드 베이스 URL */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export const HOSPITALS_API_URL = `${API_BASE_URL}/api/hospitals`;
export const VULNERABILITY_API_URL = `${API_BASE_URL}/api/vulnerability`;
