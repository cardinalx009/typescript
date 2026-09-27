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

const recalcUserTotalWordsLocal = (userId: string) => {
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
const API_TIMEOUT_LONG_MS = 9000;

export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST',
  body?: unknown,
  extra?: RequestInit,
  longTimeout = false
) => {
  try {
    const controller = new AbortController();
    const timeout = longTimeout ? API_TIMEOUT_LONG_MS : API_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const init: RequestInit = {
      method,
      signal: controller.signal,
      ...(extra || {}),
    };
    const isFormData = body instanceof FormData;
    if (!isFormData && body !== undefined && method !== 'GET') {
      init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
      init.body = JSON.stringify(body);
    } else if (isFormData) {
      init.body = body;
    }
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

const replaceLocalUsersFromGlobal = (remoteUsers: User[]) => {
  const existingPasswords = new Map<string, string>();
  for (const u of getUsers()) existingPasswords.set(u.id, u.passwordHash);
  const merged: User[] = remoteUsers.map((u) => ({
    ...u,
    passwordHash: u.passwordHash || existingPasswords.get(u.id) || '',
  }));
  saveUsers(merged);
};

const refreshGlobalLeaderboardCache = async () => {
  try {
    const resp = await apiCall('/api/leaderboard', 'GET', undefined, undefined, true);
    if (resp.ok && resp.data?.ok && Array.isArray(resp.data.users)) {
      const mapped: User[] = (resp.data.users as any[])
        .map((u: any) => ({
          id: u.id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          passwordHash: u.passwordHash || '',
          totalWords: typeof u.totalWords === 'number' ? u.totalWords : 0,
          joinedAt: u.createdAt || u.joinedAt || new Date().toISOString(),
        }))
        .sort((a: User, b: User) => (b.totalWords || 0) - (a.totalWords || 0));
      replaceLocalUsersFromGlobal(mapped);
    }
  } catch {
    /* ignore */
  }
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
    void refreshGlobalLeaderboardCache();
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
    void refreshGlobalLeaderboardCache();
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

export const savePendingAudio = async (
  file: File,
  userId?: string
): Promise<PendingAudioData & { url: string }> => {
  let uploaded: (PendingAudioData & { url: string; createdAt: any }) | null = null;
  try {
    const form = new FormData();
    form.append('audio', file);
    if (userId) form.append('userId', userId);
    const resp = await apiCall('/api/upload/audio', 'POST', form);
    if (resp.ok && resp.data?.data) {
      const d = resp.data.data;
      const ca = d.createdAt ? new Date(d.createdAt).getTime() : Date.now();
      const pending: PendingAudioData & { url: string } = {
        tempId: d.tempId,
        name: d.name || file.name,
        size: typeof d.size === 'number' ? d.size : file.size,
        createdAt: ca,
        url: d.url || `/api/audio/${d.tempId}`,
        recordId: d.recordId,
      };
      const bucket = getPendingBucket();
      bucket[pending.tempId] = {
        tempId: pending.tempId,
        name: pending.name,
        size: pending.size,
        createdAt: pending.createdAt,
        recordId: pending.recordId,
      };
      savePendingBucket(bucket);
      uploaded = pending;
    }
  } catch {
    uploaded = null;
  }

  if (uploaded) return uploaded;

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

export const getPendingAudio = async (
  tempId: string
): Promise<(PendingAudioData & { url?: string }) | null> => {
  try {
    const resp = await apiCall(`/api/pending/${tempId}`, 'GET');
    if (resp.ok && resp.data?.ok && resp.data.data) {
      const d = resp.data.data;
      const ca = d.createdAt ? new Date(d.createdAt).getTime() : Date.now();
      const result: PendingAudioData & { url?: string } = {
        tempId: d.tempId,
        name: d.name,
        size: d.size,
        createdAt: ca,
        url: d.url || `/api/audio/${d.tempId}`,
        recordId: d.recordId,
      };
      const bucket = getPendingBucket();
      bucket[tempId] = {
        tempId: result.tempId,
        name: result.name,
        size: result.size,
        createdAt: result.createdAt,
        recordId: result.recordId,
      };
      savePendingBucket(bucket);
      return result;
    }
  } catch {
    /* fallthrough */
  }

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

export const getUserRecordsLocal = (userId: string): AudioRecord[] => {
  return getRecords()
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getRecordLocal = (id: string): AudioRecord | null => {
  return getRecords().find((r) => r.id === id) || null;
};

export const getUserRecords = async (userId: string): Promise<AudioRecord[]> => {
  try {
    const resp = await apiCall(`/api/users/${userId}/records`, 'GET');
    if (resp.ok && resp.data?.ok && Array.isArray(resp.data.records)) {
      const list: AudioRecord[] = resp.data.records.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        audioName: r.audioName,
        audioObjectKey: r.audioObjectKey,
        transcript: r.transcript || '',
        wordCount: typeof r.wordCount === 'number' ? r.wordCount : 0,
        progressSeconds: typeof r.progressSeconds === 'number' ? r.progressSeconds : 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        lastEditedAt: r.lastEditedAt,
      }));
      for (const r of list) upsertLocalRecord(r);
      const total = list.reduce((s, r) => s + r.wordCount, 0);
      const cur = getCurrentUser();
      if (cur && cur.id === userId) {
        const next = { ...cur, totalWords: total };
        setCurrentUser(next);
        upsertLocalUser(next);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch {
    /* fallback */
  }
  return getUserRecordsLocal(userId);
};

export const getRecord = async (id: string): Promise<AudioRecord | null> => {
  try {
    const resp = await apiCall(`/api/records/${id}`, 'GET');
    if (resp.ok && resp.data?.ok && resp.data.record) {
      const r = resp.data.record;
      const rec: AudioRecord = {
        id: r.id,
        userId: r.userId,
        audioName: r.audioName,
        audioObjectKey: r.audioObjectKey,
        transcript: r.transcript || '',
        wordCount: typeof r.wordCount === 'number' ? r.wordCount : 0,
        progressSeconds: typeof r.progressSeconds === 'number' ? r.progressSeconds : 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        lastEditedAt: r.lastEditedAt,
      };
      upsertLocalRecord(rec);
      return rec;
    }
  } catch {
    /* fallback */
  }
  return getRecordLocal(id);
};

const syncCurrentUserWords = (userId: string) => {
  const users = getUsers();
  const records = getRecordsRaw();
  const words = records
    .filter((r) => r.userId === userId)
    .reduce((s, r) => s + r.wordCount, 0);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    users[idx].totalWords = words;
    saveUsers(users);
  }
  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    const updated = { ...cur, totalWords: words };
    setCurrentUser(updated);
    upsertLocalUser(updated);
  }
  return words;
};

export const addRecord = async (
  userId: string,
  audioName: string,
  transcript: string,
  progressSeconds = 0,
  _baseAudioData?: unknown,
  tempId?: string
): Promise<AudioRecord> => {
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const expiresISO = new Date(now + ONE_DAY_MS).toISOString();

  let serverRec: AudioRecord | null = null;
  try {
    const resp = await apiCall('/api/records', 'POST', {
      userId,
      audioName: audioName.trim(),
      transcript,
      progressSeconds,
      tempId,
    });
    if (resp.ok && resp.data?.record) {
      const r = resp.data.record;
      serverRec = {
        id: r.id,
        userId: r.userId,
        audioName: r.audioName,
        audioObjectKey: r.audioObjectKey,
        transcript: r.transcript || '',
        wordCount: typeof r.wordCount === 'number' ? r.wordCount : wordCount,
        progressSeconds: typeof r.progressSeconds === 'number' ? r.progressSeconds : progressSeconds,
        createdAt: r.createdAt || nowISO,
        expiresAt: r.expiresAt || expiresISO,
        lastEditedAt: r.lastEditedAt || nowISO,
      };
      upsertLocalRecord(serverRec);
      const cur = getCurrentUser();
      if (cur && cur.id === userId && typeof resp.data.userTotal === 'number') {
        const next = { ...cur, totalWords: resp.data.userTotal };
        setCurrentUser(next);
        upsertLocalUser(next);
      } else {
        syncCurrentUserWords(userId);
      }
      if (tempId) linkTempIdToRecord(tempId, serverRec.id);
      return serverRec;
    }
  } catch {
    /* fallback local */
  }

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
  recalcUserTotalWordsLocal(userId);
  if (tempId) linkTempIdToRecord(tempId, record.id);
  syncCurrentUserWords(userId);
  return record;
};

export const updateRecord = async (
  id: string,
  patch: { transcript?: string; audioName?: string; progressSeconds?: number }
): Promise<AudioRecord | null> => {
  try {
    const resp = await apiCall(`/api/records/${id}`, 'PATCH', patch);
    if (resp.ok && resp.data?.record) {
      const r = resp.data.record;
      const rec: AudioRecord = {
        id: r.id,
        userId: r.userId,
        audioName: r.audioName,
        audioObjectKey: r.audioObjectKey,
        transcript: r.transcript || '',
        wordCount: typeof r.wordCount === 'number' ? r.wordCount : 0,
        progressSeconds: typeof r.progressSeconds === 'number' ? r.progressSeconds : 0,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        lastEditedAt: r.lastEditedAt,
      };
      upsertLocalRecord(rec);
      syncCurrentUserWords(rec.userId);
      return rec;
    }
  } catch {
    /* fallback local */
  }

  const records = getRecordsRaw();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const r = records[idx];
  if (patch.transcript !== undefined) r.transcript = patch.transcript;
  if (patch.audioName !== undefined) r.audioName = patch.audioName;
  if (patch.progressSeconds !== undefined) r.progressSeconds = patch.progressSeconds;
  r.wordCount = r.transcript.trim() ? r.transcript.trim().split(/\s+/).length : 0;
  r.lastEditedAt = new Date().toISOString();
  saveRecordsRaw(records);
  recalcUserTotalWordsLocal(r.userId);
  syncCurrentUserWords(r.userId);
  return r;
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

export const markTelegramModalSeen = async (userId: string) => {
  try {
    await apiCall(`/api/telegram/seen/${userId}`, 'POST');
  } catch {
    /* ignore */
  }
  const raw = localStorage.getItem(TELEGRAM_JOINED_KEY);
  const list: string[] = raw ? JSON.parse(raw) : [];
  if (!list.includes(userId)) {
    list.push(userId);
    localStorage.setItem(TELEGRAM_JOINED_KEY, JSON.stringify(list));
  }
};

const fetchGlobalLeaderboardOnce = async (timeoutMs: number): Promise<User[] | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch('/api/leaderboard', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;
    const text = await resp.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { return null; }
    const list = data?.users || (Array.isArray(data) ? data : null);
    if (!Array.isArray(list)) return null;
    const mapped: User[] = list
      .map((u: any) => ({
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        passwordHash: u.passwordHash || '',
        totalWords: typeof u.totalWords === 'number' ? u.totalWords : 0,
        joinedAt: u.createdAt || u.joinedAt || new Date().toISOString(),
      }))
      .sort((a, b) => (b.totalWords || 0) - (a.totalWords || 0));
    replaceLocalUsersFromGlobal(mapped);
    return mapped;
  } catch {
    return null;
  }
};

export const getGlobalLeaderboard = async (forceRefresh = false): Promise<User[]> => {
  const attempts = forceRefresh ? 2 : 1;
  for (let i = 0; i < attempts; i++) {
    const t = i === 0 ? 9000 : 6000;
    const result = await fetchGlobalLeaderboardOnce(t);
    if (result !== null && Array.isArray(result)) {
      const cur = getCurrentUser();
      if (cur && !result.some((u) => u.id === cur.id)) {
        const merged = [...result, { ...cur }].sort(
          (a, b) => (b.totalWords || 0) - (a.totalWords || 0)
        );
        replaceLocalUsersFromGlobal(merged);
        return merged;
      }
      return result;
    }
  }
  const cur = getCurrentUser();
  const local = getLeaderboard();
  if (cur && !local.some((u) => u.id === cur.id)) {
    return [...local, { ...cur }].sort(
      (a, b) => (b.totalWords || 0) - (a.totalWords || 0)
    );
  }
  return local;
};
