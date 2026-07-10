/** 알 수 없는 throw 값을 사용자용 메시지 문자열로 변환 */
export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
