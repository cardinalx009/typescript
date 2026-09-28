import { User, AudioRecord } from './types';

const USER_KEY = 'elp_users';
const CURRENT_USER_KEY = 'elp_current_user';
const RECORDS_KEY = 'elp_records';
const TELEGRAM_JOINED_KEY = 'elp_tg_joined';
const PENDING_AUDIO_KEY = 'elp_pending_audio';
const SESSION_PENDING_URL = 'elp_pending_urls';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : [];
};
export const saveUsers = (users: User[]) => {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
};

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

const recalcUserTotalWords = (userId: string) => {
  const users = getUsers();
  const records = getRecordsRaw();
  const words = records
    .filter((r) => r.userId === userId)
    .reduce((s, r) => s + r.wordCount, 0);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    users[idx].totalWords = words;
    saveUsers(users);
    const cur = getCurrentUser();
    if (cur && cur.id === userId) {
      setCurrentUser(users[idx]);
    }
  }
  return words;
};

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string; user?: undefined };

const API_TIMEOUT_MS = 4000;

export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST',
  body?: unknown
) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };
    if (body !== undefined && method !== 'GET') init.body = JSON.stringify(body);
    const resp = await fetch(path, init);
    clearTimeout(timeoutId);
    let data: any = null;
    try { data = await resp.json(); } catch { data = null; }
    const isBusiness = resp.status >= 400 && resp.status < 500;
    return {
      ok: resp.ok && data?.ok !== false,
      status: resp.status,
      isBusiness,
      data,
    };
  } catch {
    return { ok: false, status: 0, isBusiness: false, data: null };
  }
};

const upsertLocalUser = (u: User) => {
  const users = getUsers();
  const idx = users.findIndex((x) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
  if (idx >= 0) users[idx] = { ...users[idx], ...u };
  else users.push(u);
  saveUsers(users);
};

const upsertLocalRecord = (r: AudioRecord) => {
  const records = getRecordsRaw();
  const idx = records.findIndex((x) => x.id === r.id);
  if (idx >= 0) records[idx] = { ...records[idx], ...r };
  else records.unshift(r);
  saveRecordsRaw(records);
};

export const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<AuthResult> => {
  const api = await apiCall('/api/auth/register', 'POST', { firstName, lastName, email, password });
  if (api.ok && api.data?.user) {
    const u: User = {
      id: api.data.user.id,
      firstName: api.data.user.firstName,
      lastName: api.data.user.lastName,
      email: api.data.user.email,
      passwordHash: api.data.user.passwordHash || passwordHash(password),
      totalWords: typeof api.data.user.totalWords === 'number' ? api.data.user.totalWords : 0,
      joinedAt: api.data.user.joinedAt || new Date().toISOString(),
    };
    upsertLocalUser(u);
    setCurrentUser(u);
    return { ok: true, user: u };
  }
  if (api.isBusiness) {
    return { ok: false, error: api.data?.error || 'Xatolik' };
  }

  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'Bu email allaqachon mavjud' };
  }
  const user: User = {
    id: 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    passwordHash: passwordHash(password),
    totalWords: 0,
    joinedAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return { ok: true, user };
};

export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  const api = await apiCall('/api/auth/login', 'POST', { email, password });
  if (api.ok && api.data?.user) {
    const u: User = {
      id: api.data.user.id,
      firstName: api.data.user.firstName,
      lastName: api.data.user.lastName,
      email: api.data.user.email,
      passwordHash: api.data.user.passwordHash || passwordHash(password),
      totalWords: typeof api.data.user.totalWords === 'number' ? api.data.user.totalWords : 0,
      joinedAt: api.data.user.joinedAt || new Date().toISOString(),
    };
    upsertLocalUser(u);
    setCurrentUser(u);
    return { ok: true, user: u };
  }
  if (api.isBusiness) {
    return { ok: false, error: api.data?.error || 'Xatolik' };
  }

  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { ok: false, error: 'Bunday email bilan hisob topilmadi' };
  }
  if (!passwordVerify(password, user.passwordHash)) {
    return { ok: false, error: 'Parol noto\'g\'ri' };
  }
  setCurrentUser(user);
  return { ok: true, user };
};

export const googleLogin = async (credential: string): Promise<AuthResult> => {
  const api = await apiCall('/api/auth/google', 'POST', { credential });
  if (api.ok && api.data?.user) {
    const u: User = {
      id: api.data.user.id,
      firstName: api.data.user.firstName,
      lastName: api.data.user.lastName,
      email: api.data.user.email,
      passwordHash: api.data.user.passwordHash || 'google',
      totalWords: typeof api.data.user.totalWords === 'number' ? api.data.user.totalWords : 0,
      joinedAt: api.data.user.joinedAt || new Date().toISOString(),
    };
    upsertLocalUser(u);
    setCurrentUser(u);
    return { ok: true, user: u };
  }
  return { ok: false, error: api.data?.error || 'Google bilan kirishda xatolik' };
};

export interface PendingAudioData {
  tempId: string;
  name: string;
  size: number;
  createdAt: number;
  recordId?: string;
}

const getPendingBucket = (): Record<string, PendingAudioData> => {
  const data = localStorage.getItem(PENDING_AUDIO_KEY);
  return data ? JSON.parse(data) : {};
};
const savePendingBucket = (b: Record<string, PendingAudioData>) => {
  localStorage.setItem(PENDING_AUDIO_KEY, JSON.stringify(b));
};
const getSessionUrlBucket = (): Record<string, string> => {
  try {
    const data = sessionStorage.getItem(SESSION_PENDING_URL);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};
const saveSessionUrlBucket = (b: Record<string, string>) => {
  try {
    sessionStorage.setItem(SESSION_PENDING_URL, JSON.stringify(b));
  } catch {
    /* ignore */
  }
};

export const savePendingAudio = (file: File): PendingAudioData & { url: string } => {
  const url = URL.createObjectURL(file);
  const tempId = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const pending: PendingAudioData = {
    tempId,
    name: file.name,
    size: file.size,
    createdAt: Date.now(),
  };
  const bucket = getPendingBucket();
  bucket[tempId] = pending;
  savePendingBucket(bucket);
  const urls = getSessionUrlBucket();
  urls[tempId] = url;
  saveSessionUrlBucket(urls);
  return { ...pending, url };
};

export const getPendingAudio = (
  tempId: string
): (PendingAudioData & { url?: string }) | null => {
  const bucket = getPendingBucket();
  const p = bucket[tempId];
  if (!p) return null;
  const createdAtNum = typeof p.createdAt === 'string' ? new Date(p.createdAt as unknown as string).getTime() : p.createdAt;
  if (Date.now() - createdAtNum > ONE_DAY_MS) {
    delete bucket[tempId];
    savePendingBucket(bucket);
    return null;
  }
  const urls = getSessionUrlBucket();
  const url = urls[tempId];
  return { ...p, url };
};

export const clearPendingAudio = (tempId: string) => {
  const bucket = getPendingBucket();
  if (bucket[tempId]) {
    delete bucket[tempId];
    savePendingBucket(bucket);
  }
  const urls = getSessionUrlBucket();
  if (urls[tempId]) {
    try {
      URL.revokeObjectURL(urls[tempId]);
    } catch {
      /* ignore */
    }
    delete urls[tempId];
    saveSessionUrlBucket(urls);
  }
};

export const linkTempIdToRecord = (tempId: string, recordId: string) => {
  const bucket = getPendingBucket();
  if (bucket[tempId]) {
    bucket[tempId].recordId = recordId;
    savePendingBucket(bucket);
  }
};

export const buildEditTempId = (recordId: string) => `edt_${recordId}`;

const getRecordsRaw = (): AudioRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  return data ? JSON.parse(data) : [];
};
const saveRecordsRaw = (records: AudioRecord[]) => {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

const serverRecordIds = new Set<string>();

const applyServerTotal = (userId: string, total: unknown) => {
  if (typeof total !== 'number' || !Number.isFinite(total)) return;
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    users[idx].totalWords = total;
    saveUsers(users);
  }
  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    setCurrentUser({ ...cur, totalWords: total });
  }
};

const pushRecordToServer = async (record: AudioRecord, force = false) => {
  if (!force && serverRecordIds.has(record.id)) return;
  serverRecordIds.add(record.id);
  const payload = {
    localId: record.id,
    userId: record.userId,
    audioName: record.audioName,
    transcript: record.transcript,
    wordCount: record.wordCount,
    progressSeconds: record.progressSeconds,
  };
  let resp = force
    ? await apiCall(`/api/records/${record.id}`, 'PATCH', payload)
    : { ok: false, status: 0, isBusiness: false, data: null };
  if (!resp.ok) {
    resp = await apiCall('/api/records', 'POST', payload);
  }
  if (!resp.ok) {
    serverRecordIds.delete(record.id);
    return;
  }
  applyServerTotal(record.userId, resp.data?.userTotal);
};

export const getRecords = (): AudioRecord[] => {
  const now = Date.now();
  const records = getRecordsRaw();
  let changed = false;
  for (const r of records) {
    const expiresNum = new Date(r.expiresAt).getTime();
    if (r.expiresAt && now > expiresNum) {
      if (r.transcript !== '') {
        r.transcript = '';
        changed = true;
      }
    }
  }
  if (changed) saveRecordsRaw(records);
  return records;
};

export const getUserRecords = (userId: string): AudioRecord[] => {
  return getRecords()
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getRecord = (id: string): AudioRecord | null => {
  return getRecords().find((r) => r.id === id) || null;
};

export const addRecord = (
  userId: string,
  audioName: string,
  transcript: string,
  progressSeconds = 0,
  baseAudioData?: unknown,
  tempId?: string
): AudioRecord => {
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const expiresISO = new Date(now + ONE_DAY_MS).toISOString();
  const record: AudioRecord = {
    id: 'r_' + Math.random().toString(36).slice(2, 10) + now.toString(36),
    userId,
    audioName,
    transcript,
    wordCount,
    progressSeconds: progressSeconds || 0,
    createdAt: nowISO,
    expiresAt: expiresISO,
    lastEditedAt: nowISO,
  };
  const records = getRecordsRaw();
  records.push(record);
  saveRecordsRaw(records);
  recalcUserTotalWords(userId);
  if (tempId) linkTempIdToRecord(tempId, record.id);
  void pushRecordToServer(record);
  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    const words = recalcUserTotalWords(userId);
    const updated = { ...cur, totalWords: words };
    setCurrentUser(updated);
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx >= 0) {
      users[idx] = updated;
      saveUsers(users);
    }
  }
  return record;
};

export const updateRecord = (
  id: string,
  patch: { transcript?: string; audioName?: string; progressSeconds?: number }
): AudioRecord | null => {
  const records = getRecordsRaw();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const r = records[idx];
  if (patch.transcript !== undefined) r.transcript = patch.transcript;
  if (patch.audioName !== undefined) r.audioName = patch.audioName;
  if (patch.progressSeconds !== undefined) r.progressSeconds = patch.progressSeconds;
  r.wordCount = r.transcript.trim() ? r.transcript.trim().split(/\s+/).length : 0;
  saveRecordsRaw(records);
  recalcUserTotalWords(r.userId);
  void pushRecordToServer(r, true);
  const cur = getCurrentUser();
  if (cur && cur.id === r.userId) {
    const words = recalcUserTotalWords(r.userId);
    const updated = { ...cur, totalWords: words };
    setCurrentUser(updated);
    const users = getUsers();
    const ui = users.findIndex((u) => u.id === r.userId);
    if (ui >= 0) {
      users[ui] = updated;
      saveUsers(users);
    }
  }
  return r;
};

export const deleteRecord = (id: string): boolean => {
  const records = getRecordsRaw();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  const removed = records.splice(idx, 1)[0];
  saveRecordsRaw(records);
  serverRecordIds.delete(id);
  recalcUserTotalWords(removed.userId);
  const cur = getCurrentUser();
  if (cur && cur.id === removed.userId) {
    const words = recalcUserTotalWords(removed.userId);
    const updated = { ...cur, totalWords: words };
    setCurrentUser(updated);
    const users = getUsers();
    const ui = users.findIndex((u) => u.id === removed.userId);
    if (ui >= 0) {
      users[ui] = updated;
      saveUsers(users);
    }
  }
  void apiCall(`/api/records/${id}`, 'DELETE').then((resp) => {
    if (resp.ok) applyServerTotal(removed.userId, resp.data?.userTotal);
  });
  return true;
};

export const getLeaderboard = (): User[] => {
  const users = getUsers();
  return [...users].sort((a, b) => (b.totalWords || 0) - (a.totalWords || 0));
};

export const hasSeenTelegramModal = (userId: string): boolean => {
  const raw = localStorage.getItem(TELEGRAM_JOINED_KEY);
  const list: string[] = raw ? JSON.parse(raw) : [];
  return list.includes(userId);
};

export const markTelegramModalSeen = (userId: string) => {
  const raw = localStorage.getItem(TELEGRAM_JOINED_KEY);
  const list: string[] = raw ? JSON.parse(raw) : [];
  if (!list.includes(userId)) {
    list.push(userId);
    localStorage.setItem(TELEGRAM_JOINED_KEY, JSON.stringify(list));
  }
};

export const getGlobalLeaderboard = async (force = false): Promise<User[]> => {
  const attempts = force ? 2 : 1;
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), force ? 9000 : 4000);
      const resp = await fetch('/api/leaderboard', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        const list = data?.users || data;
        if (Array.isArray(list) && list.length > 0) {
          return list
            .map((u) => ({
              id: u.id,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email || '',
              passwordHash: u.passwordHash || '',
              totalWords: typeof u.totalWords === 'number' ? u.totalWords : 0,
              joinedAt: u.joinedAt || u.createdAt || new Date().toISOString(),
            }))
            .sort((a, b) => (b.totalWords || 0) - (a.totalWords || 0));
        }
      }
    } catch {
      /* server down -> retry or fallback */
    }
  }
  return getLeaderboard();
};
