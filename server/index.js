import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { User, AudioRecord, PendingAudio, TelegramModalSeen, CourseRequest } from './models.js';

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

const { isValidObjectId, Types } = mongoose;

const findUserByAnyId = async (mixed) => {
  if (!mixed) return null;
  const needle = String(mixed).trim();
  if (!needle) return null;
  if (isValidObjectId(needle)) {
    const u = await User.findById(needle).lean();
    if (u) return u;
  }
  if (needle.includes('@')) {
    const u = await User.findOne({ email: needle.toLowerCase() }).lean();
    if (u) return u;
  }
  const u = await User.findOne({ localIds: needle }).lean();
  if (u) return u;
  return null;
};

const normalizeUserId = async (maybeLocalOrReal) => {
  if (!maybeLocalOrReal) return String(maybeLocalOrReal);
  const raw = String(maybeLocalOrReal);
  if (isValidObjectId(raw) && raw.length === 24) return raw;
  const u = await findUserByAnyId(raw);
  return u ? u._id.toString() : raw;
};

const recalcUserTotalWords = async (userIdOrLocal) => {
  try {
    const userId = await normalizeUserId(userIdOrLocal);
    const user = await findUserByAnyId(userIdOrLocal);
    if (!user) return;
    const mongoId = user._id;
    const possibleIds = [userId, mongoId.toString(), ...(user.localIds || [])];
    const recs = await AudioRecord.find({ userId: { $in: possibleIds } }).lean();
    const total = recs.reduce((s, r) => s + (r.wordCount || 0), 0);
    await User.updateOne({ _id: mongoId }, { totalWords: total });
    await AudioRecord.updateMany(
      { userId: { $in: possibleIds.filter((x) => x !== mongoId.toString()) } },
      { $set: { userId: mongoId.toString() } }
    );
    return total;
  } catch (e) {
    console.error(e);
    return null;
  }
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
    const { firstName, lastName, email, password, localUserId } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ ok: false, error: 'Barcha maydonlar to\'ldirilishi kerak' });
    }
    if (password.length < 4) {
      return res.status(400).json({ ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' });
    }
    let user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (user) {
      return res.status(409).json({ ok: false, error: 'Bu email bilan allaqachon hisob mavjud. Iltimos login qiling.' });
    }
    const salt = bcrypt.genSaltSync(10);
    const localIds = localUserId && typeof localUserId === 'string' && localUserId.startsWith('u_') ? [localUserId] : [];
    user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: bcrypt.hashSync(password, salt),
      localIds,
    });
    if (localIds.length) {
      await AudioRecord.updateMany(
        { userId: localIds[0] },
        { $set: { userId: user._id.toString() } }
      ).catch(() => {});
      await recalcUserTotalWords(user._id);
      user = await User.findById(user._id).lean();
    }
    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalWords: user.totalWords || 0,
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
    const { email, password, localUserId } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ ok: false, error: 'Email va parol kiriting' });
    }
    let user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Bu email bilan hisob topilmadi. Avval ro\'yxatdan o\'ting.' });
    }
    if (!simpleHashMatch(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Parol noto\'g\'ri. Iltimos qayta urinib ko\'ring.' });
    }
    const addLocalIds = [];
    if (localUserId && typeof localUserId === 'string' && localUserId.startsWith('u_')) {
      if (!user.localIds || !user.localIds.includes(localUserId)) addLocalIds.push(localUserId);
    }
    if (addLocalIds.length) {
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { localIds: { $each: addLocalIds } } }
      ).catch(() => {});
      for (const lid of addLocalIds) {
        try { await AudioRecord.updateMany({ userId: lid }, { $set: { userId: user._id.toString() } }); } catch { /* ignore */ }
      }
    }
    await recalcUserTotalWords(user._id);
    user = await User.findById(user._id).lean();
    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalWords: user.totalWords || 0,
        joinedAt: user.joinedAt.toISOString(),
        passwordHash: user.passwordHash,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.get('/api/auth/google/config', (_req, res) => {
  res.json({ ok: true, clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

const verifyGoogleIdToken = async (idToken) => {
  const url =
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  if (!data || data.error || !data.email) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  if (clientId && data.aud !== clientId) return null;
  if (data.email_verified === 'false' || data.email_verified === false) return null;
  return {
    sub: data.sub,
    email: String(data.email).toLowerCase(),
    givenName: data.given_name || '',
    familyName: data.family_name || '',
    picture: data.picture || '',
  };
};

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, localUserId } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ ok: false, error: 'Google token topilmadi' });
    }
    const profile = await verifyGoogleIdToken(credential);
    if (!profile) {
      return res.status(401).json({ ok: false, error: 'Google akkauntni tasdiqlab bo\'lmadi' });
    }

    let user = await User.findOne({ email: profile.email }).lean();
    if (!user && profile.sub) {
      user = await User.findOne({ googleId: profile.sub }).lean();
    }

    if (user) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            googleId: user.googleId || profile.sub,
            avatar: user.avatar || profile.picture || undefined,
            firstName: user.firstName || profile.givenName || 'User',
            lastName: user.lastName || profile.familyName || '',
          },
        }
      ).catch(() => {});
    } else {
      const created = await User.create({
        firstName: profile.givenName || 'User',
        lastName: profile.familyName || '',
        email: profile.email,
        passwordHash: 'google_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
        googleId: profile.sub,
        avatar: profile.picture || undefined,
        localIds:
          localUserId && typeof localUserId === 'string' && localUserId.startsWith('u_')
            ? [localUserId]
            : [],
      });
      user = created.toObject();
    }

    if (localUserId && typeof localUserId === 'string' && localUserId.startsWith('u_')) {
      const localRecords = await AudioRecord.find({ userId: localUserId }).lean().catch(() => []);
      if (localRecords.length) {
        await AudioRecord.updateMany(
          { userId: localUserId },
          { $set: { userId: user._id.toString() } }
        ).catch(() => {});
      }
    }

    await recalcUserTotalWords(user._id);
    user = await User.findById(user._id).lean();

    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalWords: user.totalWords || 0,
        joinedAt: user.joinedAt.toISOString(),
        passwordHash: user.passwordHash,
      },
    });
  } catch (e) {
    console.error('[GOOGLE AUTH]', e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.post('/api/course-requests', async (req, res) => {
  try {
    const { fullName, phone, age, course, note, userId } = req.body || {};
    const cleanName = (fullName || '').toString().trim();
    const cleanPhone = (phone || '').toString().trim();
    const cleanCourse = (course || '').toString().trim().toLowerCase();

    if (cleanName.length < 3) {
      return res.status(400).json({ ok: false, error: 'Ism familya kamida 3 ta belgidan iborat bo\'lsin' });
    }
    if (cleanPhone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ ok: false, error: 'Telefon raqam noto\'g\'ri' });
    }
    if (!['english', 'native', 'science'].includes(cleanCourse)) {
      return res.status(400).json({ ok: false, error: 'Kursni tanlang' });
    }

    await CourseRequest.create({
      fullName: cleanName,
      phone: cleanPhone,
      age: (age || '').toString().trim(),
      course: cleanCourse,
      note: (note || '').toString().trim().slice(0, 1000),
      userId: userId ? await normalizeUserId(userId) : undefined,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[COURSE REQUEST]', e);
    res.status(500).json({ ok: false, error: 'Server xatosi' });
  }
});

app.post('/api/upload/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Audio fayl topilmadi' });
    const userIdRaw = req.body.userId || null;
    let userId = undefined;
    if (userIdRaw) {
      try {
        userId = await normalizeUserId(userIdRaw);
        if (!userId || (!isValidObjectId(userId) || userId.length !== 24)) {
          const u = await findUserByAnyId(userIdRaw);
          userId = u ? u._id.toString() : undefined;
        }
      } catch {
        userId = undefined;
      }
      if (userId && (!isValidObjectId(userId) || userId.length !== 24)) userId = undefined;
    }
    const tempId = req.body.tempId && typeof req.body.tempId === 'string'
      ? req.body.tempId
      : 'pa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await PendingAudio.deleteOne({ tempId }).catch(() => {});
    const pa = await PendingAudio.create({
      tempId,
      userId,
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
  localId: r.localId || undefined,
  userId: String(r.userId),
  audioName: r.audioName,
  transcript: r.transcript,
  wordCount: r.wordCount,
  progressSeconds: r.progressSeconds,
  audioObjectKey: r.audioObjectKey || undefined,
  createdAt: new Date(r.createdAt).toISOString(),
  expiresAt: new Date(r.expiresAt).toISOString(),
  lastEditedAt: new Date(r.lastEditedAt).toISOString(),
});

app.post('/api/records', async (req, res) => {
  try {
    const { id, localId, userId, audioName, transcript, wordCount, progressSeconds, audioObjectKey, tempId } = req.body;
    if (!userId || !audioName?.trim()) return res.status(400).json({ ok: false, error: 'UserId va audioName kerak' });
    const finalUserId = await normalizeUserId(userId);
    const words = typeof wordCount === 'number'
      ? wordCount
      : (transcript?.trim() ? transcript.trim().split(/\s+/).length : 0);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const clientLocalId = typeof localId === 'string' ? localId : (typeof id === 'string' ? id : undefined);

    if (clientLocalId) {
      const existing = await AudioRecord.findOne({ localId: clientLocalId }).catch(() => null);
      if (existing) {
        const updated = await recalcUserTotalWords(finalUserId);
        return res.json({ ok: true, record: recordToJSON(existing), userTotal: typeof updated === 'number' ? updated : words });
      }
    }

    const rec = await AudioRecord.create({
      localId: clientLocalId,
      userId: finalUserId,
      audioName: audioName.trim(),
      transcript: transcript || '',
      wordCount: words,
      progressSeconds: progressSeconds || 0,
      audioObjectKey,
      expiresAt,
      createdAt: now,
      lastEditedAt: now,
    });
    await recalcUserTotalWords(finalUserId);
    if (tempId) {
      await PendingAudio.updateOne({ tempId }, { recordId: rec._id.toString() }).catch(() => {});
    }
    const userObj = await findUserByAnyId(finalUserId);
    const userTotal = userObj ? userObj.totalWords : words;
    res.json({ ok: true, record: recordToJSON(rec), userTotal: typeof userTotal === 'number' ? userTotal : words });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Saqlashda xato' });
  }
});

app.get('/api/records/:id', async (req, res) => {
  try {
    let rec = null;
    if (isValidObjectId(req.params.id) && req.params.id.length === 24) {
      rec = await AudioRecord.findById(req.params.id).lean();
    }
    if (!rec) {
      const byLocal = await AudioRecord.findOne({ _id: req.params.id }).lean().catch(() => null);
      rec = byLocal || null;
    }
    if (!rec) return res.status(404).json({ ok: false });
    res.json({ ok: true, record: recordToJSON(rec) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.patch('/api/records/:id', async (req, res) => {
  try {
    let rec = null;
    if (isValidObjectId(req.params.id) && req.params.id.length === 24) {
      rec = await AudioRecord.findById(req.params.id);
    }
    if (!rec) {
      rec = await AudioRecord.findOne({ localId: req.params.id }).catch(() => null);
    }
    if (!rec) return res.status(404).json({ ok: false });
    const { transcript, audioName, wordCount, progressSeconds } = req.body;
    if (transcript !== undefined) rec.transcript = transcript;
    if (audioName !== undefined) rec.audioName = audioName.trim();
    if (progressSeconds !== undefined) rec.progressSeconds = progressSeconds;
    rec.wordCount = typeof wordCount === 'number'
      ? wordCount
      : (rec.transcript?.trim() ? rec.transcript.trim().split(/\s+/).length : 0);
    rec.lastEditedAt = new Date();
    await rec.save();
    const finalUserId = await normalizeUserId(rec.userId);
    if (String(rec.userId) !== finalUserId) {
      rec.userId = finalUserId;
      await rec.save();
    }
    const total = await recalcUserTotalWords(finalUserId);
    res.json({ ok: true, record: recordToJSON(rec), userTotal: typeof total === 'number' ? total : rec.wordCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Yangilashda xato' });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    let rec = null;
    if (isValidObjectId(req.params.id) && req.params.id.length === 24) {
      rec = await AudioRecord.findById(req.params.id);
    }
    if (!rec) {
      rec = await AudioRecord.findOne({ localId: req.params.id }).catch(() => null);
    }
    if (!rec) return res.status(404).json({ ok: false });
    const finalUserId = await normalizeUserId(rec.userId);
    await AudioRecord.deleteOne({ _id: rec._id });
    const total = await recalcUserTotalWords(finalUserId);
    res.json({ ok: true, userTotal: typeof total === 'number' ? total : 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'O\'chirishda xato' });
  }
});

app.get('/api/users/:userId/records', async (req, res) => {
  try {
    const now = new Date();
    const user = await findUserByAnyId(req.params.userId);
    let queryIds = [req.params.userId];
    let totalWordsFromUser = null;
    if (user) {
      queryIds = [req.params.userId, user._id.toString(), ...(user.localIds || [])];
      totalWordsFromUser = user.totalWords;
      try {
        await AudioRecord.updateMany(
          { userId: { $in: queryIds.filter((x) => x !== user._id.toString()) } },
          { $set: { userId: user._id.toString() } }
        );
      } catch {
        /* ignore */
      }
      queryIds = [user._id.toString()];
    }
    const recs = await AudioRecord.find({ userId: { $in: queryIds } })
      .sort({ lastEditedAt: -1 })
      .lean();
    const stripped = recs.map((r) => {
      const expired = r.expiresAt && r.expiresAt < now;
      if (expired) {
        return recordToJSON({
          ...r,
          transcript: '',
          audioObjectKey: undefined,
        });
      }
      return recordToJSON(r);
    });
    res.json({ ok: true, records: stripped, totalWords: totalWordsFromUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { totalWords, firstName, lastName } = req.body || {};
    const update = {};
    if (typeof totalWords === 'number') update.totalWords = totalWords;
    if (typeof firstName === 'string' && firstName.trim()) update.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) update.lastName = lastName.trim();
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, error: 'Yangilanish uchun maydonlar yuborilmadi' });
    }
    const user = await findUserByAnyId(req.params.userId);
    if (!user) return res.status(404).json({ ok: false });
    const u = await User.findByIdAndUpdate(user._id, { $set: update }, { new: true }).lean();
    if (!u) return res.status(404).json({ ok: false });
    res.json({
      ok: true,
      user: {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        totalWords: u.totalWords || 0,
        joinedAt: u.joinedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const totalCount = await User.countDocuments({});
    const users = await User.find()
      .sort({ totalWords: -1 })
      .limit(200)
      .lean();
    const mapped = users.map((u) => {
      const joinedAt = u.joinedAt || u.createdAt || new Date(0);
      return {
        id: u._id.toString(),
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        totalWords: typeof u.totalWords === 'number' ? u.totalWords : 0,
        joinedAt: joinedAt instanceof Date ? joinedAt.toISOString() : new Date(joinedAt).toISOString(),
      };
    });
    console.log(`[LEADERBOARD] total users in DB: ${totalCount}, returning top ${mapped.length}`);
    if (mapped.length) {
      console.log('[LEADERBOARD] top 3:', mapped.slice(0, 3).map((u) => `${u.id.slice(-6)} ${u.firstName} ${u.lastName} w=${u.totalWords}`));
    }
    res.json({ ok: true, users: mapped });
  } catch (e) {
    console.error('[LEADERBOARD] error:', e);
    res.status(500).json({ ok: false });
  }
});



app.get('/api/telegram/seen/:userId', async (req, res) => {
  try {
    const userId = await normalizeUserId(req.params.userId);
    const finalUserId = userId && isValidObjectId(userId) && userId.length === 24
      ? userId
      : String(req.params.userId);
    const doc = await TelegramModalSeen.findOne({ userId: finalUserId }).lean().catch(() => null);
    res.json({ ok: true, seen: !!doc });
  } catch (e) { res.json({ ok: false, seen: false }); }
});

app.post('/api/telegram/seen/:userId', async (req, res) => {
  try {
    const userId = await normalizeUserId(req.params.userId);
    const finalUserId = userId && isValidObjectId(userId) && userId.length === 24
      ? userId
      : String(req.params.userId);
    await TelegramModalSeen.findOneAndUpdate(
      { userId: finalUserId },
      { seen: true },
      { upsert: true, new: true }
    ).catch(async () => {
      if (finalUserId !== String(req.params.userId)) {
        return TelegramModalSeen.findOneAndUpdate(
          { userId: String(req.params.userId) },
          { seen: true },
          { upsert: true, new: true }
        );
      }
      return null;
    });
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
