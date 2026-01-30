/**
 * Safe fetch utilities that handle non-JSON error responses gracefully.
 *
 * Prevents "Unexpected token '<'" errors when the server returns HTML
 * (e.g., 404 pages, middleware failures) instead of JSON.
 */

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        /* ignore parse failure */
      }
    }
    throw new Error(errorMessage);
  }

  return response;
}

export async function safeFetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await safeFetch(url, options);
  return response.json();
}
