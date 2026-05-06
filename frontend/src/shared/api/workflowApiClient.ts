import axios, { AxiosError } from 'axios';
import { STORAGE_KEYS } from '@/shared/constants/storage.constants';

type WorkflowEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | string | null;
};

type PersistedAuthState = {
  state?: {
    session?: {
      accessToken?: string;
    } | null;
  };
};

const workflowApiBaseUrl = import.meta.env.VITE_WORKFLOW_API_BASE_URL ?? 'http://127.0.0.1:8001/api/v1';

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

const errorMessage = (error: WorkflowEnvelope<unknown>['error']): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  return error.message ?? error.code ?? null;
};

export const workflowApiClient = axios.create({
  baseURL: workflowApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

workflowApiClient.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

workflowApiClient.interceptors.response.use(
  (response) => {
    const envelope = response.data as WorkflowEnvelope<unknown>;
    if (envelope && envelope.success === false) {
      throw new Error(errorMessage(envelope.error) ?? 'Workflow request failed.');
    }

    return response;
  },
  (error: AxiosError<WorkflowEnvelope<unknown>>) => {
    const envelope = error.response?.data;
    const message = errorMessage(envelope?.error);
    if (message) {
      throw new Error(message);
    }

    if (error.response?.status) {
      throw new Error(`Workflow request failed with status ${error.response.status}.`);
    }

    throw new Error(error.message || 'Workflow service is unavailable.');
  },
);

export const unwrapWorkflowData = <T>(payload: WorkflowEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as WorkflowEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(errorMessage(envelope.error) ?? 'Workflow request failed.');
    }
    return envelope.data as T;
  }

  return payload as T;
};

export type { WorkflowEnvelope };
