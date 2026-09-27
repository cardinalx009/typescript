import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true },
  totalWords: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  localIds: { type: [String], default: [], index: true },
});

const AudioRecordSchema = new mongoose.Schema({
  localId: { type: String, index: true, sparse: true },
  userId: { type: String, required: true, index: true },
  audioName: { type: String, required: true, trim: true },
  transcript: { type: String, default: '' },
  wordCount: { type: Number, default: 0 },
  progressSeconds: { type: Number, default: 0 },
  audioObjectKey: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true },
  lastEditedAt: { type: Date, default: Date.now },
});

AudioRecordSchema.index({ userId: 1, lastEditedAt: -1 });

const PendingAudioSchema = new mongoose.Schema({
  tempId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.Mixed },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
  url: { type: String },
  audioData: { type: Buffer },
  createdAt: { type: Date, default: Date.now, expires: '2h' },
  recordId: { type: String },
});

const TelegramModalSeenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
  seen: { type: Boolean, default: true },
});

export const User = mongoose.model('User', UserSchema);
export const AudioRecord = mongoose.model('AudioRecord', AudioRecordSchema);
export const PendingAudio = mongoose.model('PendingAudio', PendingAudioSchema);
export const TelegramModalSeen = mongoose.model('TelegramModalSeen', TelegramModalSeenSchema);
