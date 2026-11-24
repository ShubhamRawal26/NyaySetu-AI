export interface ApiErrorResult {
  error?: string;
}

function mapHttpStatusToFriendlyError(status: number, fallback: string): string {
  if (status === 413) {
    return 'The uploaded file is too large. Please try a smaller photo or PDF.';
  }
  if (status === 429) {
    return 'Too many requests right now. Please wait a few seconds and try again.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'The AI service is briefly busy. Please try again in a few seconds.';
  }
  if (status >= 500) {
    return 'The server encountered a temporary error. Please try again in a moment.';
  }
  return fallback;
}

export async function postJsonWithRetry<T extends ApiErrorResult>(
  url: string,
  payload: unknown,
  fallbackError: string
): Promise<T> {
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      throw new Error(
        'Could not reach the server. Please check your connection and try again.'
      );
    }

    const rawText = await res.text();
    let parsed: T | null = null;
    if (rawText.trim().length > 0) {
      try {
        parsed = JSON.parse(rawText) as T;
      } catch {
        parsed = null;
      }
    }

    if (parsed !== null) {
      if (!res.ok) {
        throw new Error(
          parsed.error || mapHttpStatusToFriendlyError(res.status, fallbackError)
        );
      }
      return parsed;
    }

    // Non-JSON response (typically a transient reverse-proxy 502/503/504 HTML page)
    const isTransientProxyStatus =
      res.status === 502 || res.status === 503 || res.status === 504;
    if (isTransientProxyStatus && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }

    throw new Error(mapHttpStatusToFriendlyError(res.status, fallbackError));
  }

  throw new Error(fallbackError);
}
