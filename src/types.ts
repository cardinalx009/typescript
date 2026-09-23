export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  totalWords: number;
  joinedAt: string;
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
