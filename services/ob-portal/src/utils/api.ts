const BASE_URL = '';

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
}

async function request<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = sessionStorage.getItem('qantara_access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let data: T;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = (await response.text()) as unknown as T;
  }

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      statusText: response.statusText,
      message: typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : response.statusText,
    };
    throw error;
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    data,
  };
}

export const api = {
  get: <T = unknown>(url: string, headers?: Record<string, string>) =>
    request<T>(url, { method: 'GET', headers }),

  post: <T = unknown>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers }),

  put: <T = unknown>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, headers }),

  patch: <T = unknown>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, headers }),

  delete: <T = unknown>(url: string, headers?: Record<string, string>) =>
    request<T>(url, { method: 'DELETE', headers }),

  raw: request,
};
