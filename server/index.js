import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { User, AudioRecord, PendingAudio, TelegramModalSeen } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI not configured — running without DB. Frontend will auto-fallback to localStorage. Set MONGODB_URI in Railway Variables to enable global leaderboard & shared accounts.');
} else {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => console.log('✅ MongoDB connected: King School Learning Center DB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err.message));
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

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

const userAuthResponse = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  totalWords: user.totalWords,
  joinedAt: user.joinedAt.toISOString(),
  passwordHash: user.passwordHash || undefined,
  googleId: user.googleId || undefined,
  avatar: user.avatar || undefined,
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'King School Learning Center Listening API', uptime: process.uptime() });
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
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      if (existing.googleId) {
        return res.status(409).json({ ok: false, error: 'Bu email Google orqali ro\'yxatdan o\'tgan. Iltimos Google bilan kiring.' });
      }
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
      user: userAuthResponse(user),
      isNew: true,
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
    if (user.googleId && !user.passwordHash) {
      return res.status(401).json({ ok: false, error: 'Bu hisob Google orqali ochilgan. Iltimos Google bilan kiring.' });
    }
    if (!user.passwordHash || !simpleHashMatch(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Parol noto\'g\'ri. Iltimos qayta urinib ko\'ring.' });
    }
    res.json({
      ok: true,
      user: userAuthResponse(user),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ ok: false, error: 'Google token topilmadi' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const gRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!gRes.ok) {
      return res.status(401).json({ ok: false, error: 'Google token noto\'g\'ri' });
    }
    const payload = await gRes.json();
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ ok: false, error: 'Google token client id mos emas' });
    }
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
      return res.status(401).json({ ok: false, error: 'Google email tasdiqlanmagan' });
    }
    const email = String(payload.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(401).json({ ok: false, error: 'Google email topilmadi' });
    }
    const googleId = String(payload.sub || '');
    const fullName = String(payload.name || '').trim();
    const picture = String(payload.picture || '').trim();
    let firstName = String(payload.given_name || '').trim();
    let lastName = String(payload.family_name || '').trim();
    if (!firstName && fullName) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    if (!firstName) firstName = email.split('@')[0] || 'User';
    if (!lastName) lastName = '';

    let user = await User.findOne({ $or: [{ googleId }, { email }] }).lean();
    let isNew = false;
    if (user) {
      const patch = {};
      if (googleId && !user.googleId) patch.googleId = googleId;
      if (picture && !user.avatar) patch.avatar = picture;
      if (!user.firstName) patch.firstName = firstName;
      if (!user.lastName) patch.lastName = lastName;
      if (Object.keys(patch).length) {
        await User.updateOne({ _id: user._id }, patch);
        user = await User.findById(user._id).lean();
      }
    } else {
      user = await User.create({
        firstName,
        lastName,
        email,
        googleId,
        avatar: picture || undefined,
      });
      isNew = true;
    }
    res.json({ ok: true, user: userAuthResponse(user), isNew });
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return res.status(504).json({ ok: false, error: 'Google serveriga ulanishda timeout' });
    }
    console.error('Google auth error:', e);
    res.status(500).json({ ok: false, error: 'Google orqali kirishda xatolik' });
  }
});

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const patch = {};
    if (firstName !== undefined) {
      const v = String(firstName).trim();
      if (v) patch.firstName = v;
    }
    if (lastName !== undefined) {
      patch.lastName = String(lastName).trim();
    }
    if (!Object.keys(patch).length) {
      return res.status(400).json({ ok: false, error: 'Yangilanadigan maydon yo\'q' });
    }
    const user = await User.findByIdAndUpdate(req.params.userId, patch, { new: true }).lean();
    if (!user) return res.status(404).json({ ok: false });
    res.json({ ok: true, user: userAuthResponse(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Yangilashda xato' });
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

const dist = path.resolve(__dirname, '..', 'dist');
const distIndex = path.join(dist, 'index.html');
if (fs.existsSync(distIndex)) {
  console.log(`📦 Serving static frontend from: ${dist}`);
  app.use(express.static(dist));
  app.get('*', (_req, res) => {
    res.sendFile(distIndex);
  });
} else {
  console.warn(`⚠️ dist/index.html not found at ${distIndex} — run "npm run build" to generate frontend. Static site will NOT be available.`);
  app.get('/', (_req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html lang="en"><head><meta charset="utf-8"><title>King School — Build required</title></head>
      <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h1 style="color:#1e3a8a;">👑 King School Learning Center</h1>
        <h2 style="color:#64748b;">Frontend build topilmadi</h2>
        <p style="max-width:520px;margin:16px auto;">Server ishlayapti, lekin <code>dist/</code> folderi yo'q. Railway Build Command sozlanmagan bo'lishi mumkin.<br><br>
        <strong>Qo'llanma:</strong> Railway Settings → <em>Build Command</em> ga <code>npm run build</code> yozing va redeploy qiling.<br><br>
        <a href="/api/health" style="color:#2563eb;">Healthcheck → /api/health</a></p>
      </body></html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 King School Learning Center API running on http://localhost:${PORT}`);
});
