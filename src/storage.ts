import { User, AudioRecord } from './types';

const USER_KEY = 'elp_users';
const CURRENT_USER_KEY = 'elp_current_user';
const RECORDS_KEY = 'elp_records';
const TELEGRAM_JOINED_KEY = 'elp_tg_joined';
const PENDING_AUDIO_KEY = 'elp_pending_audio';

const API_TIMEOUT_MS = 4000;

type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; isBusiness: boolean };

const safeJson = async (resp: Response) => {
  try {
    return await resp.json();
  } catch {
    return null;
  }
};

const callApi = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> => {
  try {
    const resp = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(init.headers || {}),
      },
    });

    const json = await safeJson(resp);

    if (resp.ok) {
      if (json && json.ok === false && typeof json.error === 'string') {
        return { ok: false, error: json.error, isBusiness: true };
      }
      return { ok: true, value: json as T };
    }

    const isBusiness = resp.status >= 400 && resp.status < 500;
    const errorMsg =
      (json && typeof json.error === 'string' && json.error) ||
      `Server xatosi (${resp.status})`;
    return { ok: false, error: errorMsg, isBusiness };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network xatosi',
      isBusiness: false,
    };
  }
};

const simpleHash = (s: string): string => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + s.length.toString(36);
};

export const passwordHash = (p: string) => simpleHash(p + '::king_school::salt');
export const passwordVerify = (p: string, h: string) => passwordHash(p) === h;

const getUsersLocal = (): User[] => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : [];
};

const saveUsersLocal = (users: User[]) => {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
};

export const getUsers = (): User[] => getUsersLocal();
export const saveUsers = saveUsersLocal;

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...user }));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

const upsertLocalUser = (u: User) => {
  const users = getUsersLocal();
  const idx = users.findIndex(
    (x) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase()
  );
  if (idx !== -1) users[idx] = u;
  else users.push(u);
  saveUsersLocal(users);
};

export const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> => {
  const api = await callApi<{ ok: boolean; user?: User; error?: string }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password }),
    }
  );

  if (api.ok && api.value && api.value.ok && api.value.user) {
    const u: User = api.value.user;
    upsertLocalUser(u);
    setCurrentUser(u);
    return { ok: true, user: u };
  }

  if (api.ok && api.value && api.value.ok === false && api.value.error) {
    return { ok: false, error: api.value.error };
  }
  if (!api.ok && api.isBusiness) {
    return { ok: false, error: api.error };
  }

  // Fallback: localStorage
  const users = getUsersLocal();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'Bu email bilan allaqachon hisob mavjud. Iltimos login qiling.' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak.' };
  }
  const user: User = {
    id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    passwordHash: passwordHash(password),
    totalWords: 0,
    joinedAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsersLocal(users);
  setCurrentUser(user);
  return { ok: true, user };
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> => {
  const api = await callApi<{ ok: boolean; user?: User; error?: string }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );

  if (api.ok && api.value && api.value.ok && api.value.user) {
    const u: User = api.value.user;
    upsertLocalUser(u);
    setCurrentUser(u);
    return { ok: true, user: u };
  }
  if (api.ok && api.value && api.value.ok === false && api.value.error) {
    return { ok: false, error: api.value.error };
  }
  if (!api.ok && api.isBusiness) {
    return { ok: false, error: api.error };
  }

  // Fallback: localStorage
  const users = getUsersLocal();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { ok: false, error: 'Bu email bilan hisob topilmadi. Avval ro\'yxatdan o\'ting.' };
  }
  if (!passwordVerify(password, user.passwordHash)) {
    return { ok: false, error: 'Parol noto\'g\'ri. Iltimos qayta urinib ko\'ring.' };
  }
  setCurrentUser(user);
  return { ok: true, user };
};

const getRecordsLocal = (): AudioRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  if (!data) return [];
  const records: AudioRecord[] = JSON.parse(data);
  const now = Date.now();
  const validRecords = records.filter((r) => new Date(r.expiresAt).getTime() > now);
  if (validRecords.length !== records.length) {
    saveRecordsLocal(validRecords);
  }
  return validRecords;
};

const saveRecordsLocal = (records: AudioRecord[]) => {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const recalcUserTotalWords = async (userId: string) => {
  const users = getUsersLocal();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  const recs = await getUserRecords(userId);
  const total = recs.reduce((s, r) => s + r.wordCount, 0);
  users[idx].totalWords = total;
  saveUsersLocal(users);
  const cur = getCurrentUser();
  if (cur && cur.id === userId) setCurrentUser(users[idx]);
};

export const addRecord = async (
  userId: string,
  audioName: string,
  transcript: string,
  progressSeconds = 0,
  audioObjectKey?: string,
  tempId?: string
): Promise<AudioRecord> => {
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const api = await callApi<{ ok: boolean; record?: AudioRecord; error?: string }>(
    '/api/records',
    {
      method: 'POST',
      body: JSON.stringify({
        userId,
        audioName,
        transcript,
        progressSeconds,
        audioObjectKey,
        tempId,
      }),
    }
  );

  if (api.ok && api.value && api.value.ok && api.value.record) {
    const r: AudioRecord = api.value.record;
    const records = getRecordsLocal();
    records.push(r);
    saveRecordsLocal(records);
    await recalcUserTotalWords(userId);
    return r;
  }

  // Fallback: local
  const records = getRecordsLocal();
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const record: AudioRecord = {
    id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
    userId,
    audioName: audioName.trim(),
    transcript,
    wordCount,
    progressSeconds,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    lastEditedAt: now.toISOString(),
    audioObjectKey,
  };
  records.push(record);
  saveRecordsLocal(records);
  await recalcUserTotalWords(userId);
  return record;
};

export const getRecord = async (id: string): Promise<AudioRecord | null> => {
  const api = await callApi<{ ok: boolean; record?: AudioRecord }>(`/api/records/${id}`, {
    method: 'GET',
  });
  if (api.ok && api.value && api.value.ok && api.value.record) {
    return api.value.record;
  }
  if (!api.ok && api.isBusiness) return null;
  return getRecordsLocal().find((r) => r.id === id) || null;
};

export const updateRecord = async (
  id: string,
  patch: Partial<Pick<AudioRecord, 'transcript' | 'audioName' | 'progressSeconds'>>
): Promise<AudioRecord | null> => {
  const api = await callApi<{ ok: boolean; record?: AudioRecord; error?: string }>(
    `/api/records/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );

  if (api.ok && api.value && api.value.ok && api.value.record) {
    const updated: AudioRecord = api.value.record;
    const records = getRecordsLocal();
    const idx = records.findIndex((r) => r.id === id);
    if (idx !== -1) records[idx] = updated;
    else records.push(updated);
    saveRecordsLocal(records);
    await recalcUserTotalWords(updated.userId);
    return updated;
  }
  if (!api.ok && api.isBusiness) return null;

  // Fallback: local
  const records = getRecordsLocal();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const r = records[idx];
  if (patch.transcript !== undefined) r.transcript = patch.transcript;
  if (patch.audioName !== undefined) r.audioName = patch.audioName.trim();
  if (patch.progressSeconds !== undefined) r.progressSeconds = patch.progressSeconds;
  const newWordCount = r.transcript.trim() ? r.transcript.trim().split(/\s+/).length : 0;
  const oldWordCount = r.wordCount;
  r.wordCount = newWordCount;
  r.lastEditedAt = new Date().toISOString();
  const userId = r.userId;
  saveRecordsLocal(records);
  if (newWordCount !== oldWordCount) await recalcUserTotalWords(userId);
  return r;
};

export const getRecords = async (): Promise<AudioRecord[]> => {
  return getRecordsLocal();
};

export const getUserRecords = async (userId: string): Promise<AudioRecord[]> => {
  const api = await callApi<{ ok: boolean; records?: AudioRecord[] }>(
    `/api/users/${encodeURIComponent(userId)}/records`,
    { method: 'GET' }
  );
  if (api.ok && api.value && api.value.ok && Array.isArray(api.value.records)) {
    const list: AudioRecord[] = api.value.records;
    const all = getRecordsLocal().filter((r) => r.userId !== userId);
    for (const r of list) all.push(r);
    saveRecordsLocal(all);
    return [...list].sort(
      (a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    );
  }
  return getRecordsLocal()
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    );
};

export const getLeaderboard = async (): Promise<User[]> => {
  const api = await callApi<{ ok: boolean; users?: Array<{ id: string; firstName: string; lastName: string; email: string; totalWords: number; joinedAt: string; passwordHash?: string }> }>(
    '/api/leaderboard',
    { method: 'GET' }
  );
  if (api.ok && api.value && api.value.ok && Array.isArray(api.value.users)) {
    const list: User[] = api.value.users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      passwordHash: u.passwordHash || '',
      totalWords: typeof u.totalWords === 'number' ? u.totalWords : 0,
      joinedAt: u.joinedAt || new Date(0).toISOString(),
    }));
    return list.sort((a, b) => b.totalWords - a.totalWords);
  }
  return getUsersLocal().sort((a, b) => b.totalWords - a.totalWords);
};

export const hasSeenTelegramModal = async (userId: string): Promise<boolean> => {
  const api = await callApi<{ ok: boolean; seen?: boolean }>(
    `/api/telegram/seen/${encodeURIComponent(userId)}`,
    { method: 'GET' }
  );
  if (api.ok && api.value && api.value.ok && typeof api.value.seen === 'boolean') {
    if (api.value.seen) {
      const data = localStorage.getItem(TELEGRAM_JOINED_KEY);
      const joined: Record<string, boolean> = data ? JSON.parse(data) : {};
      joined[userId] = true;
      localStorage.setItem(TELEGRAM_JOINED_KEY, JSON.stringify(joined));
    }
    return api.value.seen;
  }
  const data = localStorage.getItem(TELEGRAM_JOINED_KEY);
  if (!data) return false;
  const joined: Record<string, boolean> = JSON.parse(data);
  return !!joined[userId];
};

export const markTelegramModalSeen = async (userId: string): Promise<void> => {
  const api = await callApi<{ ok: boolean }>(
    `/api/telegram/seen/${encodeURIComponent(userId)}`,
    { method: 'POST', body: '{}' }
  );
  if (api.ok && api.value && api.value.ok) {
    /* synced */
  }
  const data = localStorage.getItem(TELEGRAM_JOINED_KEY);
  const joined: Record<string, boolean> = data ? JSON.parse(data) : {};
  joined[userId] = true;
  localStorage.setItem(TELEGRAM_JOINED_KEY, JSON.stringify(joined));
};

export interface PendingAudioData {
  tempId: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  recordId?: string;
}

export const savePendingAudio = async (
  file: File,
  linkedRecordId?: string
): Promise<PendingAudioData> => {
  try {
    const fd = new FormData();
    fd.append('audio', file);
    if (linkedRecordId) fd.append('recordId', linkedRecordId);
    const cu = getCurrentUser();
    if (cu) fd.append('userId', cu.id);

    const api = await callApi<{
      ok: boolean;
      data?: {
        tempId: string;
        name: string;
        size: number;
        type: string;
        url: string;
        createdAt: string;
        recordId?: string;
      };
      error?: string;
    }>('/api/upload/audio', { method: 'POST', body: fd });

    if (api.ok && api.value && api.value.ok && api.value.data) {
      const d = api.value.data;
      const item: PendingAudioData = {
        tempId: d.tempId,
        name: d.name,
        size: d.size,
        type: d.type,
        url: d.url,
        createdAt: d.createdAt,
        recordId: d.recordId,
      };
      localStorage.setItem(
        PENDING_AUDIO_KEY + '_' + item.tempId,
        JSON.stringify({
          tempId: item.tempId,
          name: item.name,
          size: item.size,
          type: item.type,
          createdAt: item.createdAt,
          recordId: item.recordId,
        })
      );
      sessionStorage.setItem(PENDING_AUDIO_KEY + '_url_' + item.tempId, item.url);
      return item;
    }
    if (!api.ok && api.isBusiness) {
      throw new Error(api.error || 'Upload xatosi');
    }
  } catch {
    /* fallback */
  }

  // Fallback: local
  const url = URL.createObjectURL(file);
  const data: PendingAudioData = {
    tempId: 'pa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name,
    size: file.size,
    type: file.type,
    url,
    createdAt: new Date().toISOString(),
    recordId: linkedRecordId,
  };
  localStorage.setItem(
    PENDING_AUDIO_KEY + '_' + data.tempId,
    JSON.stringify({
      tempId: data.tempId,
      name: data.name,
      size: data.size,
      type: data.type,
      createdAt: data.createdAt,
      recordId: data.recordId,
    })
  );
  sessionStorage.setItem(PENDING_AUDIO_KEY + '_url_' + data.tempId, url);
  return data;
};

export const getPendingAudio = async (tempId: string): Promise<PendingAudioData | null> => {
  try {
    const api = await callApi<{
      ok: boolean;
      data?: {
        tempId: string;
        name: string;
        size: number;
        type: string;
        url: string;
        createdAt: string;
        recordId?: string;
      };
    }>(`/api/pending/${encodeURIComponent(tempId)}`, { method: 'GET' });
    if (api.ok && api.value && api.value.ok && api.value.data) {
      const d = api.value.data;
      const item: PendingAudioData = {
        tempId: d.tempId,
        name: d.name,
        size: d.size,
        type: d.type,
        url: d.url,
        createdAt: d.createdAt,
        recordId: d.recordId,
      };
      localStorage.setItem(
        PENDING_AUDIO_KEY + '_' + item.tempId,
        JSON.stringify({
          tempId: item.tempId,
          name: item.name,
          size: item.size,
          type: item.type,
          createdAt: item.createdAt,
          recordId: item.recordId,
        })
      );
      sessionStorage.setItem(PENDING_AUDIO_KEY + '_url_' + item.tempId, item.url);
      return item;
    }
  } catch {
    /* fall through */
  }

  const data = localStorage.getItem(PENDING_AUDIO_KEY + '_' + tempId);
  if (!data) return null;
  const base = JSON.parse(data);
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (!url) return null;
  return { ...base, url };
};

export const clearPendingAudio = (tempId: string) => {
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (url && url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
  }
  sessionStorage.removeItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  localStorage.removeItem(PENDING_AUDIO_KEY + '_' + tempId);
};

export const updateUserProfile = async (
  userId: string,
  patch: { firstName?: string; lastName?: string; password?: string }
): Promise<{ ok: boolean; user?: User; error?: string }> => {
  const api = await callApi<{ ok: boolean; user?: User; error?: string }>(
    `/api/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
  if (api.ok && api.value && api.value.ok && api.value.user) {
    const u: User = api.value.user;
    upsertLocalUser(u);
    const cur = getCurrentUser();
    if (cur && cur.id === userId) setCurrentUser(u);
    return { ok: true, user: u };
  }
  if (api.ok && api.value && api.value.ok === false) {
    return { ok: false, error: api.value.error || 'Yangilashda xato' };
  }
  if (!api.ok && api.isBusiness) {
    return { ok: false, error: api.error };
  }
  // Fallback: local
  const users = getUsersLocal();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { ok: false, error: 'Foydalanuvchi topilmadi' };
  if (patch.firstName?.trim()) users[idx].firstName = patch.firstName.trim();
  if (patch.lastName?.trim()) users[idx].lastName = patch.lastName.trim();
  if (patch.password && patch.password.length >= 4) {
    users[idx].passwordHash = passwordHash(patch.password);
  } else if (patch.password) {
    return { ok: false, error: 'Parol kamida 4 ta belgi bo\'lishi kerak' };
  }
  saveUsersLocal(users);
  const cur = getCurrentUser();
  if (cur && cur.id === userId) setCurrentUser(users[idx]);
  return { ok: true, user: users[idx] };
};

export const RECORD_EDIT_PREFIX = 'rec_';
export const buildEditTempId = (recordId: string) => RECORD_EDIT_PREFIX + recordId;

export const linkTempIdToRecord = (tempId: string, recordId: string) => {
  const key = PENDING_AUDIO_KEY + '_' + tempId;
  const data = localStorage.getItem(key);
  if (!data) return;
  const parsed = JSON.parse(data);
  parsed.recordId = recordId;
  localStorage.setItem(key, JSON.stringify(parsed));
};
