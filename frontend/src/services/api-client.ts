const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface ApiResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
  pagination?: { cursor: string | null; has_more: boolean; limit: number };
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw new ApiRequestError(
        'Unable to connect to server. Please check your connection.',
        'NETWORK_ERROR',
        0,
      );
    }

    if (!response.ok) {
      let errorBody: ApiErrorBody | null = null;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          errorBody = await response.json();
        } catch {
          // JSON parse failed, use fallback
        }
      }

      throw new ApiRequestError(
        errorBody?.error.message ?? `Request failed with status ${response.status}`,
        errorBody?.error.code ?? 'UNKNOWN_ERROR',
        response.status,
        errorBody?.error.details,
      );
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>('GET', path, { params });
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>('PUT', path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient(API_BASE);
