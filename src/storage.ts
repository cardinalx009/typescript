import { User, AudioRecord } from './types';

const USER_KEY = 'elp_users';
const CURRENT_USER_KEY = 'elp_current_user';
const RECORDS_KEY = 'elp_records';
const TELEGRAM_JOINED_KEY = 'elp_tg_joined';
const PENDING_AUDIO_KEY = 'elp_pending_audio';

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

export const registerUser = (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): { ok: boolean; user?: User; error?: string } => {
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
};

export const loginUser = (
  email: string,
  password: string
): { ok: boolean; user?: User; error?: string } => {
  const users = getUsers();
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

export const recalcUserTotalWords = (userId: string) => {
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

export const addRecord = (
  userId: string,
  audioName: string,
  transcript: string,
  progressSeconds = 0,
  audioObjectKey?: string
): AudioRecord => {
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
  recalcUserTotalWords(userId);
  return record;
};

export const getRecord = (id: string): AudioRecord | null => {
  return getRecords().find((r) => r.id === id) || null;
};

export const updateRecord = (
  id: string,
  patch: Partial<Pick<AudioRecord, 'transcript' | 'audioName' | 'progressSeconds'>>
): AudioRecord | null => {
  const records = getRecords();
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
  saveRecords(records);
  if (newWordCount !== oldWordCount) recalcUserTotalWords(userId);
  return r;
};

export const getUserRecords = (userId: string): AudioRecord[] => {
  return getRecords()
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()
    );
};

export const getLeaderboard = (): User[] => {
  return getUsers().sort((a, b) => b.totalWords - a.totalWords);
};

export const hasSeenTelegramModal = (userId: string): boolean => {
  const data = localStorage.getItem(TELEGRAM_JOINED_KEY);
  if (!data) return false;
  const joined: Record<string, boolean> = JSON.parse(data);
  return !!joined[userId];
};

export const markTelegramModalSeen = (userId: string) => {
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

export const savePendingAudio = (file: File, linkedRecordId?: string): PendingAudioData => {
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
  localStorage.setItem(PENDING_AUDIO_KEY + '_' + data.tempId, JSON.stringify({
    tempId: data.tempId, name: data.name, size: data.size, type: data.type, createdAt: data.createdAt, recordId: data.recordId,
  }));
  sessionStorage.setItem(PENDING_AUDIO_KEY + '_url_' + data.tempId, url);
  return data;
};

export const getPendingAudio = (tempId: string): PendingAudioData | null => {
  const data = localStorage.getItem(PENDING_AUDIO_KEY + '_' + tempId);
  if (!data) return null;
  const base = JSON.parse(data);
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (!url) return null;
  return { ...base, url };
};

export const clearPendingAudio = (tempId: string) => {
  const url = sessionStorage.getItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  if (url) {
    try { URL.revokeObjectURL(url); } catch {}
    sessionStorage.removeItem(PENDING_AUDIO_KEY + '_url_' + tempId);
  }
  localStorage.removeItem(PENDING_AUDIO_KEY + '_' + tempId);
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
