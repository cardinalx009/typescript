import { User, AudioRecord } from './types';

const USER_KEY = 'elp_users';
const CURRENT_USER_KEY = 'elp_current_user';
const RECORDS_KEY = 'elp_records';
const TELEGRAM_JOINED_KEY = 'elp_tg_joined';
const PENDING_AUDIO_KEY = 'elp_pending_audio';
const PENDING_AUDIO_CACHE_KEY = 'elp_pending_audio_cache';

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

const API_UNAVAILABLE_MSG = 'Server bilan aloqa yo\'q, lokal rejimda ishlayapti';

const warnLocal = (fnName: string) => console.warn(`[storage] ${fnName}: ${API_UNAVAILABLE_MSG}`);

const isNetworkError = (e: unknown) =>
  e instanceof TypeError || (e as any)?.message?.includes('fetch') || (e as any)?.name === 'AbortError';

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
    const safe: User = { ...user };
    if ((safe as any).passwordHash === null) delete (safe as any).passwordHash;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safe));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const updateCurrentUser = (patch: Partial<User>) => {
  const cur = getCurrentUser();
  if (!cur) return;
  const next = { ...cur, ...patch };
  setCurrentUser(next);
};

export const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> => {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.user) {
      setCurrentUser(body.user);
      return { ok: true, user: body.user, error: undefined };
    }
    return { ok: false, error: body?.error || `Xato (${res.status})` };
  } catch (e) {
    if (!isNetworkError(e)) {
      return { ok: false, error: 'Ro\'yxatdan o\'tishda xatolik' };
    }
    warnLocal('registerUser');
    const users = getUsers();
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
    saveUsers(users);
    setCurrentUser(user);
    return { ok: true, user };
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.user) {
      setCurrentUser(body.user);
      return { ok: true, user: body.user, error: undefined };
    }
    return { ok: false, error: body?.error || `Xato (${res.status})` };
  } catch (e) {
    if (!isNetworkError(e)) {
      return { ok: false, error: 'Kirishda xatolik' };
    }
    warnLocal('loginUser');
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { ok: false, error: 'Bu email bilan hisob topilmadi. Avval ro\'yxatdan o\'ting.' };
    }
    if (!user.passwordHash || !passwordVerify(password, user.passwordHash)) {
      return { ok: false, error: 'Parol noto\'g\'ri. Iltimos qayta urinib ko\'ring.' };
    }
    setCurrentUser(user);
    return { ok: true, user };
  }
};

export const authWithGoogle = async (
  idToken: string
): Promise<{ ok: boolean; user?: User; isNew?: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.user) {
      setCurrentUser(body.user);
      return { ok: true, user: body.user, isNew: !!body.isNew, error: undefined };
    }
    return { ok: false, error: body?.error || `Google kirishda xato (${res.status})` };
  } catch (e) {
    return { ok: false, error: isNetworkError(e) ? 'Server bilan aloqa yo\'q' : 'Google orqali kirishda xatolik' };
  }
};

export const patchUser = async (
  userId: string,
  patch: Partial<Pick<User, 'firstName' | 'lastName'>>
): Promise<User | null> => {
  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.user) {
      const updated = body.user as User;
      const cur = getCurrentUser();
      if (cur && cur.id === updated.id) setCurrentUser(updated);
      const users = getUsers();
      const idx = users.findIndex((u) => u.id === updated.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updated };
        saveUsers(users);
      }
      return updated;
    }
    return null;
  } catch (e) {
    warnLocal('patchUser');
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    if (patch.firstName !== undefined) users[idx].firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) users[idx].lastName = patch.lastName.trim();
    saveUsers(users);
    const cur = getCurrentUser();
    if (cur && cur.id === userId) setCurrentUser({ ...cur, ...patch });
    return users[idx];
  }
};

export const getRecords = (): AudioRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  if (!data) return [];
  const records: AudioRecord[] = JSON.parse(data);
  const now = Date.now();
  const validRecords = records.filter((r) => new Date(r.expiresAt).getTime() > now);
  if (validRecords.length !== records.length) {
    saveRecords(validRecords);
  }
  return validRecords;
};

export const saveRecords = (records: AudioRecord[]) => {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const recalcUserTotalWordsLocal = (userId: string) => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  const recs = getRecords().filter((r) => r.userId === userId);
  const total = recs.reduce((s, r) => s + r.wordCount, 0);
  users[idx].totalWords = total;
  saveUsers(users);
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
  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audioName, transcript, progressSeconds, audioObjectKey, tempId }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.record) {
      const rec = body.record as AudioRecord;
      const records = getRecords();
      const idx = records.findIndex((r) => r.id === rec.id);
      if (idx !== -1) records[idx] = rec; else records.push(rec);
      saveRecords(records);
      return rec;
    }
  } catch (e) {
    warnLocal('addRecord');
  }
  const records = getRecords();
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
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
  saveRecords(records);
  recalcUserTotalWordsLocal(userId);
  return record;
};

export const getRecord = async (id: string): Promise<AudioRecord | null> => {
  try {
    const res = await fetch(`/api/records/${id}`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.record) return body.record as AudioRecord;
  } catch (e) {
    warnLocal('getRecord');
  }
  return getRecords().find((r) => r.id === id) || null;
};

export const updateRecord = async (
  id: string,
  patch: Partial<Pick<AudioRecord, 'transcript' | 'audioName' | 'progressSeconds'>>
): Promise<AudioRecord | null> => {
  try {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.record) {
      const rec = body.record as AudioRecord;
      const records = getRecords();
      const idx = records.findIndex((r) => r.id === rec.id);
      if (idx !== -1) records[idx] = rec;
      saveRecords(records);
      return rec;
    }
  } catch (e) {
    warnLocal('updateRecord');
  }
  const records = getRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const r = records[idx];
  const oldWordCount = r.wordCount;
  if (patch.transcript !== undefined) r.transcript = patch.transcript;
  if (patch.audioName !== undefined) r.audioName = patch.audioName.trim();
  if (patch.progressSeconds !== undefined) r.progressSeconds = patch.progressSeconds;
  const newWordCount = r.transcript.trim() ? r.transcript.trim().split(/\s+/).length : 0;
  r.wordCount = newWordCount;
  r.lastEditedAt = new Date().toISOString();
  saveRecords(records);
  if (newWordCount !== oldWordCount) recalcUserTotalWordsLocal(r.userId);
  return r;
};

export const getUserRecords = async (userId: string): Promise<AudioRecord[]> => {
  try {
    const res = await fetch(`/api/users/${userId}/records`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && Array.isArray(body.records)) {
      const apiRecords = body.records as AudioRecord[];
      const records = getRecords();
      for (const ar of apiRecords) {
        const idx = records.findIndex((x) => x.id === ar.id);
        if (idx !== -1) records[idx] = ar; else records.push(ar);
      }
      saveRecords(records);
      return apiRecords;
    }
  } catch (e) {
    warnLocal('getUserRecords');
  }
  return getRecords()
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    );
};

export const getLeaderboard = async (): Promise<User[]> => {
  try {
    const res = await fetch('/api/leaderboard');
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && Array.isArray(body.users)) {
      return body.users as User[];
    }
  } catch (e) {
    warnLocal('getLeaderboard');
  }
  return getUsers().sort((a, b) => b.totalWords - a.totalWords);
};

export const hasSeenTelegramModal = async (userId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/telegram/seen/${userId}`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok) return !!body.seen;
  } catch (e) {
    // fall through local
  }
  const data = localStorage.getItem(TELEGRAM_JOINED_KEY);
  if (!data) return false;
  const joined: Record<string, boolean> = JSON.parse(data);
  return !!joined[userId];
};

export const markTelegramModalSeen = async (userId: string) => {
  try {
    await fetch(`/api/telegram/seen/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (_e) {
    // ignore
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

const readPendingCache = (): Record<string, PendingAudioData> => {
  try {
    const raw = localStorage.getItem(PENDING_AUDIO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const writePendingCache = (cache: Record<string, PendingAudioData>) => {
  try {
    localStorage.setItem(PENDING_AUDIO_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore quota */ }
};

export const savePendingAudio = async (file: File, userId?: string, linkedRecordId?: string): Promise<PendingAudioData> => {
  try {
    const fd = new FormData();
    fd.append('audio', file);
    if (userId) fd.append('userId', userId);
    if (linkedRecordId) fd.append('recordId', linkedRecordId);
    const res = await fetch('/api/upload/audio', { method: 'POST', body: fd });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.data) {
      const data = body.data as PendingAudioData;
      const cache = readPendingCache();
      cache[data.tempId] = data;
      writePendingCache(cache);
      return data;
    }
  } catch (e) {
    warnLocal('savePendingAudio');
  }
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
  const cache = readPendingCache();
  cache[data.tempId] = data;
  writePendingCache(cache);
  sessionStorage.setItem(PENDING_AUDIO_KEY + '_url_' + data.tempId, url);
  return data;
};

export const getPendingAudio = async (tempId: string): Promise<PendingAudioData | null> => {
  try {
    const res = await fetch(`/api/pending/${tempId}`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok && body?.data) {
      const data = body.data as PendingAudioData;
      const cache = readPendingCache();
      cache[data.tempId] = data;
      writePendingCache(cache);
      return data;
    }
  } catch (e) {
    // fallthrough
  }
  const cache = readPendingCache();
  if (cache[tempId]) return cache[tempId];
  const legacyKey = PENDING_AUDIO_KEY + '_' + tempId;
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return null;
  const base = JSON.parse(legacy);
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (!url) return null;
  return { ...base, url };
};

export const clearPendingAudio = (tempId: string) => {
  const cache = readPendingCache();
  const entry = cache[tempId];
  if (entry && entry.url.startsWith('blob:')) {
    try { URL.revokeObjectURL(entry.url); } catch {}
  }
  delete cache[tempId];
  writePendingCache(cache);
  const legacyKey = PENDING_AUDIO_KEY + '_' + tempId;
  localStorage.removeItem(legacyKey);
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (url) {
    try { URL.revokeObjectURL(url); } catch {}
    sessionStorage.removeItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  }
};

export const RECORD_EDIT_PREFIX = 'rec_';

export const buildEditTempId = (recordId: string) => RECORD_EDIT_PREFIX + recordId;

export const linkTempIdToRecord = (tempId: string, recordId: string) => {
  const cache = readPendingCache();
  if (cache[tempId]) {
    cache[tempId].recordId = recordId;
    writePendingCache(cache);
  }
  const key = PENDING_AUDIO_KEY + '_' + tempId;
  const data = localStorage.getItem(key);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      parsed.recordId = recordId;
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch { /* ignore */ }
  }
};
