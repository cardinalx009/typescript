import type {
  AdminUser,
  AdminUserRecord,
  CourseRequestItem,
  MockFileItem,
  User,
} from './types';

const ADMIN_TOKEN_KEY = 'ks_admin_token';

export type { AdminUser, AdminUserRecord, CourseRequestItem, MockFileItem } from './types';

export const ADMIN_USER: User = {
  id: 'admin',
  firstName: 'Admin',
  lastName: 'King School',
  email: 'kingschool777',
  passwordHash: '',
  totalWords: 0,
  joinedAt: new Date().toISOString(),
  isAdmin: true,
};

export const getAdminToken = (): string =>
  localStorage.getItem(ADMIN_TOKEN_KEY) || '';

export const setAdminToken = (token: string) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminToken = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const isAdminSession = (): boolean => !!getAdminToken();

const API_TIMEOUT_MS = 15000;

export const adminApi = async <T = any>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
  isForm = false
): Promise<{
  ok: boolean;
  status: number;
  data: (T & { error?: string }) | null;
}> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${getAdminToken()}`,
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      },
      signal: controller.signal,
    };
    if (body !== undefined) {
      init.body = isForm ? (body as FormData) : JSON.stringify(body);
    }
    const resp = await fetch(path, init);
    clearTimeout(timeoutId);
    let data: any = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    return { ok: resp.ok && data?.ok !== false, status: resp.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

export interface AdminStats {
  users: number;
  records: number;
  totalWords: number;
  requests: number;
  newRequests: number;
  mocks: number;
}

export const fetchAdminStats = () =>
  adminApi<{ stats: AdminStats }>('/api/admin/stats');

export const fetchAdminUsers = (search = '') =>
  adminApi<{ users: AdminUser[] }>(
    `/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`
  );

export const fetchAdminUserRecords = (id: string) =>
  adminApi<{ user: { firstName: string; lastName: string; email: string }; records: AdminUserRecord[] }>(
    `/api/admin/users/${encodeURIComponent(id)}/records`
  );

export const blockAdminUser = (id: string, blocked: boolean) =>
  adminApi(`/api/admin/users/${encodeURIComponent(id)}/block`, 'POST', { blocked });

export const deleteAdminUser = (id: string) =>
  adminApi(`/api/admin/users/${encodeURIComponent(id)}`, 'DELETE');

export const fetchCourseRequests = () =>
  adminApi<{ requests: CourseRequestItem[] }>('/api/admin/requests');

export const setRequestStatus = (id: string, status: string) =>
  adminApi(`/api/admin/requests/${encodeURIComponent(id)}/status`, 'POST', { status });

export const deleteRequest = (id: string) =>
  adminApi(`/api/admin/requests/${encodeURIComponent(id)}`, 'DELETE');

export const uploadMockFile = (kind: 'listening' | 'reading', title: string, file: File) => {
  const form = new FormData();
  form.append('kind', kind);
  form.append('title', title);
  form.append('file', file);
  return adminApi<{ mock: MockFileItem }>('/api/admin/mocks', 'POST', form, true);
};

export const deleteMockFile = (id: string) =>
  adminApi(`/api/admin/mocks/${encodeURIComponent(id)}`, 'DELETE');
