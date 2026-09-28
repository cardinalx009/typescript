export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  totalWords: number;
  joinedAt: string;
  isAdmin?: boolean;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalWords: number;
  recordCount: number;
  isBlocked: boolean;
  joinedAt: string;
}

export interface AdminUserRecord {
  id: string;
  audioName: string;
  transcript: string;
  wordCount: number;
  progressSeconds: number;
  createdAt: string;
}

export interface CourseRequestItem {
  _id: string;
  fullName: string;
  phone: string;
  age: string;
  course: string;
  note: string;
  status: 'new' | 'contacted' | 'done';
  createdAt: string;
}

export interface MockFileItem {
  id: string;
  kind: 'listening' | 'reading';
  title: string;
  fileName: string;
  size: number;
  createdAt: string;
}

export interface AudioRecord {
  id: string;
  userId: string;
  audioName: string;
  audioObjectKey?: string;
  transcript: string;
  wordCount: number;
  progressSeconds: number;
  createdAt: string;
  expiresAt: string;
  lastEditedAt: string;
}

export interface PendingAudio {
  tempId: string;
  file: File;
  url: string;
  createdAt: string;
}
