import axios, { AxiosError } from 'axios';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: {
    code: string;
    message: string;
    details: unknown[];
  } | null;
  meta: {
    request_id: string;
    timestamp: string;
  };
};

type PersistedAuthState = {
  state?: {
    session?: {
      accessToken?: string;
    } | null;
  };
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

export const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const readAccessToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  const stored = window.localStorage.getItem(STORAGE_KEYS.auth);
  if (!stored) return undefined;

  try {
    const parsed = JSON.parse(stored) as PersistedAuthState;
    return parsed.state?.session?.accessToken;
  } catch {
    return undefined;
  }
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const envelope = response.data as ApiEnvelope<unknown>;
    if (envelope && envelope.success === false && envelope.error) {
      throw new Error(envelope.error.message || envelope.error.code);
    }

    return response;
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const envelope = error.response?.data;
    if (envelope?.error) {
      throw new Error(envelope.error.message || envelope.error.code);
    }

    throw error;
  },
);

export const unwrapApiData = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope.success && envelope.error) {
    throw new Error(envelope.error.message || envelope.error.code);
  }

  return envelope.data;
};

export type { ApiEnvelope };
