export class FetchTimeoutError extends Error {
  constructor(message = '요청 시간이 초과되었습니다') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/** AbortSignal 기반 fetch 타임아웃 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const handleExternalAbort = () => {
    controller.abort();
  };

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', handleExternalAbort);
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (init.signal?.aborted) {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new FetchTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (init.signal) {
      init.signal.removeEventListener('abort', handleExternalAbort);
    }
  }
}
