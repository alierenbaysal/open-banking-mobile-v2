import { useCallback, useState } from 'react';
import { api, ApiResponse, ApiError } from '../utils/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      let response: ApiResponse<T>;
      if (method === 'get' || method === 'delete') {
        response = await api[method]<T>(url, headers);
      } else {
        response = await api[method]<T>(url, body, headers);
      }
      setState({ data: response.data, loading: false, error: null });
      return response;
    } catch (err) {
      const apiError = err as ApiError;
      setState({ data: null, loading: false, error: apiError });
      return null;
    }
  }, []);

  const get = useCallback((url: string, headers?: Record<string, string>) =>
    execute('get', url, undefined, headers), [execute]);

  const post = useCallback((url: string, body?: unknown, headers?: Record<string, string>) =>
    execute('post', url, body, headers), [execute]);

  const put = useCallback((url: string, body?: unknown, headers?: Record<string, string>) =>
    execute('put', url, body, headers), [execute]);

  const del = useCallback((url: string, headers?: Record<string, string>) =>
    execute('delete', url, undefined, headers), [execute]);

  return {
    ...state,
    get,
    post,
    put,
    del,
    reset: useCallback(() => setState({ data: null, loading: false, error: null }), []),
  };
}
