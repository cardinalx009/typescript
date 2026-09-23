# Asadbek Posts - English Listening Practice

> Asadbek Posts (King School) o'quv markazi uchun ingliz tili Listening mashq platformasi.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 🛠️ Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Router v6
- **Afsusiy storage**: localStorage (client-side)
- **Real database**: MongoDB + Express backend (server/ folder)

## 🔧 Environment variables

`.env` faylini yarating:

```
MONGODB_URI=mongodb+srv://catm82142_db_user:bekzod001@cluster0.eto2i6j.mongodb.net/?appName=Cluster0
PORT=5000
NODE_ENV=development
```

## 🧱 Scripts

| Command             | What it does                                 |
|---------------------|----------------------------------------------|
| `npm run dev`       | Frontend dev server (Vite)                   |
| `npm run server`    | Backend Express server (MongoDB mode)        |
| `npm run start:full`| Frontend + Backend bir vaqtda (concurrently) |
| `npm run build`     | Production build to dist/                    |
| `npm run preview`   | Buildni preview qilish                       |

## 🌐 Railway deploy

Frontend (static site):
- Build command: `npm run build`
- Publish directory: `dist`

Backend (Node.js):
- Build command: `npm install`
- Start command: `npm run server`
- Env: `MONGODB_URI` + `PORT`

## 📚 Features

- 🔐 Ro'yxatdan o'tish / Login (parol bilan)
- 🎵 Audio yuklash (30MB gacha) va tinglash
- ⌨️ Desktop: Left Shift = Pause/Play, Ctrl+Enter = 5s orqaga
- 📝 Word-kabi katta matn maydoni
- 💾 **Auto-save**: matn/nom/progress sekundlari avtomatik saqlanadi
- 📚 Tarixda 🔁 **Davom etish** — audio qayerda qolgan bo'lsa o'sha joydan
- 🏆 Leaderboard (yozilgan so'zlar soniga ko'ra)
- ✈️ Telegram kanal: https://t.me/asadbekposts
