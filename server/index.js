import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { User, AudioRecord, PendingAudio, TelegramModalSeen } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log('✅ MongoDB connected: Asadbek Posts DB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const recalcUserTotalWords = async (userId) => {
  try {
    const recs = await AudioRecord.find({ userId }).lean();
    const total = recs.reduce((s, r) => s + (r.wordCount || 0), 0);
    await User.updateOne({ _id: userId }, { totalWords: total });
  } catch (e) { console.error(e); }
};

const simpleHashMatch = (p, h) => {
  const simple = (s) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      hash = (hash << 5) - hash + c;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + s.length.toString(36);
  };
  if (h.startsWith('h_') && simple(p + '::king_school::salt') === h) return true;
  if (h.startsWith('$2a$') || h.startsWith('$2b$')) return bcrypt.compareSync(p, h);
  return false;
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Asadbek Posts Listening API', uptime: process.uptime() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ ok: false, error: 'Barcha maydonlar to\'ldirilishi kerak' });
    }
    if (password.length < 4) {
      return res.status(400).json({ ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Bu email bilan allaqachon hisob mavjud. Iltimos login qiling.' });
    }
    const salt = bcrypt.genSaltSync(10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: bcrypt.hashSync(password, salt),
    });
    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalWords: user.totalWords,
        joinedAt: user.joinedAt.toISOString(),
        passwordHash: user.passwordHash,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ ok: false, error: 'Email va parol kiriting' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Bu email bilan hisob topilmadi. Avval ro\'yxatdan o\'ting.' });
    }
    if (!simpleHashMatch(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Parol noto\'g\'ri. Iltimos qayta urinib ko\'ring.' });
    }
    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalWords: user.totalWords,
        joinedAt: user.joinedAt.toISOString(),
        passwordHash: user.passwordHash,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Audio fayl topilmadi' });
    const userId = req.body.userId || null;
    const tempId = 'pa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const pa = await PendingAudio.create({
      tempId,
      userId: userId || undefined,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      audioData: req.file.buffer,
      recordId: req.body.recordId || undefined,
    });
    res.json({
      ok: true,
      data: {
        tempId,
        name: pa.name,
        size: pa.size,
        type: pa.type,
        url: `/api/audio/${tempId}`,
        createdAt: pa.createdAt.toISOString(),
        recordId: pa.recordId || undefined,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Faylni saqlashda xato' });
  }
});

app.get('/api/audio/:tempId', async (req, res) => {
  try {
    const pa = await PendingAudio.findOne({ tempId: req.params.tempId }).lean();
    if (!pa || !pa.audioData) return res.status(404).end();
    res.setHeader('Content-Type', pa.type || 'audio/mpeg');
    res.setHeader('Content-Length', pa.size);
    res.setHeader('Cache-Control', 'public, max-age=7200');
    return res.send(pa.audioData.buffer instanceof Buffer
      ? pa.audioData.buffer
      : Buffer.from(pa.audioData));
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

app.get('/api/pending/:tempId', async (req, res) => {
  try {
    const pa = await PendingAudio.findOne({ tempId: req.params.tempId }).lean();
    if (!pa) return res.json({ ok: false });
    res.json({
      ok: true,
      data: {
        tempId: pa.tempId,
        name: pa.name,
        size: pa.size,
        type: pa.type,
        url: `/api/audio/${pa.tempId}`,
        createdAt: pa.createdAt.toISOString(),
        recordId: pa.recordId || undefined,
      },
    });
  } catch (e) {
    console.error(e);
    res.json({ ok: false });
  }
});

const recordToJSON = (r) => ({
  id: r._id.toString(),
  userId: r.userId.toString(),
  audioName: r.audioName,
  transcript: r.transcript,
  wordCount: r.wordCount,
  progressSeconds: r.progressSeconds,
  audioObjectKey: r.audioObjectKey || undefined,
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt.toISOString(),
  lastEditedAt: r.lastEditedAt.toISOString(),
});

app.post('/api/records', async (req, res) => {
  try {
    const { userId, audioName, transcript, progressSeconds, audioObjectKey, tempId } = req.body;
    if (!userId || !audioName?.trim()) return res.status(400).json({ ok: false, error: 'UserId va audioName kerak' });
    const wordCount = transcript?.trim() ? transcript.trim().split(/\s+/).length : 0;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const rec = await AudioRecord.create({
      userId,
      audioName: audioName.trim(),
      transcript: transcript || '',
      wordCount,
      progressSeconds: progressSeconds || 0,
      audioObjectKey,
      expiresAt,
      createdAt: now,
      lastEditedAt: now,
    });
    await recalcUserTotalWords(userId);
    if (tempId) {
      await PendingAudio.updateOne({ tempId }, { recordId: rec._id.toString() });
    }
    res.json({ ok: true, record: recordToJSON(rec) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Saqlashda xato' });
  }
});

app.get('/api/records/:id', async (req, res) => {
  try {
    const rec = await AudioRecord.findById(req.params.id).lean();
    if (!rec) return res.status(404).json({ ok: false });
    res.json({ ok: true, record: recordToJSON(rec) });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.patch('/api/records/:id', async (req, res) => {
  try {
    const { transcript, audioName, progressSeconds } = req.body;
    const rec = await AudioRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ ok: false });
    if (transcript !== undefined) rec.transcript = transcript;
    if (audioName !== undefined) rec.audioName = audioName.trim();
    if (progressSeconds !== undefined) rec.progressSeconds = progressSeconds;
    rec.wordCount = rec.transcript?.trim() ? rec.transcript.trim().split(/\s+/).length : 0;
    rec.lastEditedAt = new Date();
    await rec.save();
    await recalcUserTotalWords(rec.userId);
    res.json({ ok: true, record: recordToJSON(rec) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Yangilashda xato' });
  }
});

app.get('/api/users/:userId/records', async (req, res) => {
  try {
    const now = new Date();
    const recs = await AudioRecord.find({
      userId: req.params.userId,
      expiresAt: { $gt: now },
    }).sort({ lastEditedAt: -1 }).lean();
    res.json({ ok: true, records: recs.map(recordToJSON) });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const users = await User.find().sort({ totalWords: -1 }).limit(200).lean();
    res.json({
      ok: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        totalWords: u.totalWords,
        joinedAt: u.joinedAt.toISOString(),
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/telegram/seen/:userId', async (req, res) => {
  try {
    const doc = await TelegramModalSeen.findOne({ userId: req.params.userId }).lean();
    res.json({ ok: true, seen: !!doc });
  } catch (e) { res.json({ ok: false, seen: false }); }
});

app.post('/api/telegram/seen/:userId', async (req, res) => {
  try {
    await TelegramModalSeen.findOneAndUpdate(
      { userId: req.params.userId },
      { seen: true },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Asadbek Posts API running on http://localhost:${PORT}`);
});
