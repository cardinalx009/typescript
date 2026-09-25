# Leaderboard Global va Google Auth Implementation Plan

## Repository Research

### Hozirgi holat (muammo sababi)
Loyihada **ikkita parallel tizim** bor, lekin frontend faqatgina **localStorage** (`storage.ts`) orqali ishlayapti, backend API (MongoDB) umuman chaqirilmayapti. Shuning uchun:
- Leaderboardda faqat shu browserda yaratilgan akkauntlar ko'rinadi (har bir user o'zining lokal reytingini ko'radi).
- Audio yozuvlar ham faqat lokal, boshqa qurilmadan ko'rinmaydi.

### Mavjud backend API (server/index.js) — hammasi allaqachon yozilgan:
- `POST /api/auth/register` → MongoDB ga user yozish (bcrypt bilan hash)
- `POST /api/auth/login` → userni tekshirish
- `GET /api/leaderboard` → MongoDB dagi BARCHA userlarni reytingda qaytarish ✅
- `POST /api/upload/audio` + `GET /api/audio/:tempId` → audio faylni serverda saqlash
- `GET /api/pending/:tempId` → pending audio metasini olish
- `POST /api/records`, `GET /api/records/:id`, `PATCH /api/records/:id` → transkripsiya yozuvlari
- `GET /api/users/:userId/records` → user tarixini olish
- `GET/POST /api/telegram/seen/:userId` → Telegram modal ko'rilganligi

### Hozirgi frontend da API yo'qligi
- `storage.ts` — to'liq localStorage tizimi, hech qachon `fetch` qilmaydi.
- `vite.config.ts` — dev proxy (`/api → localhost:5000`) yo'q.
- `package.json` da `npm start:full` bor — ikkala serverni ham ishga tushiradi.

### Google Auth uchun talablar
- Google Cloud Console dan OAuth 2.0 Client ID olish kerak (foydalanuvchi o'zi oladi, biz sozlashni taqdim etamiz).
- Frontend: Google Identity Services (GIS) `<script>` orqali → "Google bilan kirish" tugmasi → `id_token` olish.
- Backend: `/api/auth/google` endpointi → `id_token` ni Google `tokeninfo` orqali verify qilish → email bo'yicha user topish yoki yangi yaratish → userni qaytarish.
- User model: `googleId` (String, unique), `passwordHash` → Google userlarda optional qilish kerak.

## Files and Modules

| File | O'zgarish |
|---|---|
| `vite.config.ts` | Dev proxy `/api → http://localhost:5000` qo'shish |
| `.env` | `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` o'zgaruvchilarini qo'shish |
| `src/storage.ts` | **Hammasi almashtiriladi**: API ga asoslangan yozuvlar. Register/login/records/leaderboard hammasi `fetch` API chaqiradi. Offline/API ulanmasa localStorage fallback qilib qoladi. |
| `server/models.js` | User modelga `googleId: String (unique)` va `avatar: String` qo'shish, `passwordHash` ni optional qilish |
| `server/index.js` | `POST /api/auth/google` endpointini qo'shish (id_token verify + findOrCreate user) |
| `src/components/Login.tsx` | Google Sign-In button qo'shish (GIS SDK), Google auth callback |
| `src/types.ts` | User interfeysiga `googleId?`, `avatar?` optional maydonlar qo'shish |
| `index.html` | Google Identity Services `<script>` tagini qo'shish |
| `src/components/Transcribe.tsx` | Audio upload uchun API `/api/upload/audio` dan foydalanish |
| `src/App.tsx` | Google auth qo'shilganda user sessionni to'g'ri tutish |
| `src/components/Profile.tsx` | Storage `saveUsers` o'rniga yangi API orqali userni yangilash |
| `src/components/Dashboard.tsx` | Audio uploadni server API ga yuborish |

## Implementation Steps (dependency-order)

### Step 1: Vite proxy + env sozlash
- `vite.config.ts`: `server.proxy = { '/api': 'http://localhost:5000' }` qo'shish
- `.env`: `VITE_GOOGLE_CLIENT_ID=` va `GOOGLE_CLIENT_ID=` (placeholder, foydalanuvchi keyin to'ldiradi)

### Step 2: User modelni yangilash (Google uchun)
- `server/models.js`: UserSchema ga `googleId: { type: String, unique: true, sparse: true }` va `avatar: String` qo'shish. `passwordHash` ni oldindan majburiy edi — Google userlar uchun uni null/undefined qilish uchun `required: false` qilamiz va register endpointida manual tekshiramiz.

### Step 3: Backendga Google Auth endpointini qo'shish
- `server/index.js` da `POST /api/auth/google` yozish:
  - `idToken` ni body dan olish
  - `https://oauth2.googleapis.com/tokeninfo?id_token=...` ga GET so'rov yuborish
  - Response ni tekshirish: `aud` === `GOOGLE_CLIENT_ID`, email verifikatsiyalangan bo'lishi
  - `googleId` yoki `email` bo'yicha user izlash
  - Topilmasa: yangi user yaratish (firstName = Google bergan name bo'linmasi, Google profile picture avatar sifatida)
  - Topilsa/yaratilgan userni standart formatda qaytarish

### Step 4: storage.ts ni API ga asoslangan holda qayta yozish (Eng muhim qism)
Har bir funksiyani API orqali ishlaydigan qilish:
- `registerUser()` → `POST /api/auth/register` → response userni setCurrentUser() ga yozish → userni return qilish
- `loginUser()` → `POST /api/auth/login` → same
- `getLeaderboard()` → `GET /api/leaderboard` → users array
- `addRecord()` → `POST /api/records` → record
- `getRecord()` → `GET /api/records/:id`
- `updateRecord()` → `PATCH /api/records/:id`
- `getUserRecords()` → `GET /api/users/:userId/records`
- `hasSeenTelegramModal()` → `GET /api/telegram/seen/:userId`
- `markTelegramModalSeen()` → `POST /api/telegram/seen/:userId`
- `savePendingAudio(file)` → `POST /api/upload/audio` (FormData-da file + userId) → pendingData ni localStorage ga ham keshlemiz, url = `/api/audio/:tempId`
- `getPendingAudio(tempId)` → avval localStorage keshini, keyin `GET /api/pending/:tempId` (API ni ustuvor qilamiz)
- `clearPendingAudio()` → localStorage dan tozalash
- `linkTempIdToRecord()` → POST/PATCH emas, addRecord da allaqachon tempId yuboriladi (backendda update qiladi), shunga storage da hech narsa
- **Fallback**: Agar fetch xato bersa (NetworkError) — eski localStorage logikasiga qaytib ishlaydi (agar eski data mavjud bo'lsa), va userga "Server bilan aloqa yo'q, lokal rejim" xabari berilishi uchun `console.warn`.
- `setCurrentUser`/`getCurrentUser` — localStorage da qoladi (session uchun kerak).

### Step 5: Google Identity Services frontend integratsiyasi
- `index.html` head ga `<script src="https://accounts.google.com/gsi/client" async defer></script>` qo'shish
- `Login.tsx`:
  - "Google bilan kirish" tugmasi uchun joy (Login va Register tablarining tepasida yoki pastida)
  - `useEffect` da GIS ni initialize qilish: `window.google.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: handleGoogleResponse })`
  - "Google bilan davom etish" custom styled button (GIS render_button emas, o'z stildagi button `onClick` → `window.google.accounts.id.prompt()` yoki o'zimiz chaqiramiz)
  - `handleGoogleResponse(response)` → `response.credential` (bu idToken JWT) ni `POST /api/auth/google` ga yuborish → user qaytsa `onAuth(user, isNew=true/false)` ni chaqirish

### Step 6: Audio uploadni serverga o'tkazish
- `Dashboard.tsx` `handleFile()` → `savePendingAudio(file, user.id)` — yangi storage API orqali serverga upload qiladi
- `Transcribe.tsx` audio initialization → `getPendingAudio(tempId)` → API dan URL oladi (server `/api/audio/:tempId` dan serve qiladi)

### Step 7: Profile.tsx va boshqa komponentlarni moslash
- Profile.tsx `saveUsers` / `getUsers` — bu hozir local userlarni edit qilish uchun ishlatilgan. Buni API `/api/users/:userId` PATCH endpointi bilan almashtirish kerak. (Agar profil edit qiladigan bo'lsa — hozirgi kodda `saveUsers` ishlatiladi, bu userni update qilish uchun)

## Dependencies and Considerations

- **Vite dev proxy muhim**: Proxy bo'lmasa, `fetch('/api/...')` → vite dev server (port 5173) ga boradi, 404 beradi.
- **CORS**: Backendda `cors()` yoqilgan (all origins). Dev proxy ishlatganimizda CORS masalasi yo'q.
- **Google Client ID**: Foydalanuvchi Google Cloud Console → OAuth 2.0 Client ID olishi kerak:
  - Authorized JavaScript origins: `http://localhost:5173` (dev) + production URL
  - Client ID ni `.env` fayliga: `VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com` va `GOOGLE_CLIENT_ID=...` (ikkisi bir xil qiymat)
- **Google userlarda password yo'q**: `passwordHash` maydoni bo'sh bo'ladi, shuning uchun oddiy login parol bilan urinmasligi kerak. Oddiy login endpointida `passwordHash` mavjudligini tekshirish kerak — bo'lmasa "Parol o'rnatilmagan, Google bilan kiring" xatosi.
- **API bilan ishlash user ID formatini o'zgartiradi**: localStorage `Date.now()_random` (string), MongoDB `_id` (24 belgili hex). Barcha joylarda `user.id` ishlatilgani — API qaytargan `id` (stringified `_id`) avtomatik mos tushadi.
- **Audio serverda saqlanishi (30MB limit)**: Hozirgi backend `multer` memoryStorage (RAM) ishlatadi, bu katta fayllar uchun yaxshi emas. Ammo hozircha ishlaydi, keyinchalik S3/Cloudinary ga ko'chiriladi (project memory da ham yozilgan).
- **Transkripsiya matni 1 kun TTL**: Backend AudioRecord modelda `expiresAt` bor + MongoDB TTL emas, shuning uchun loyiha yagona oynali ishlaganda TTL ishlamaydi. API get endpointida filter qilinyapti — bu yetarli.

## Validation

1. `npm run build` → compile + typecheck (tsc error yo'qligini tekshirish)
2. `npm run start:full` (frontend 5173 + backend 5000) → ikkala ham ishlashi
3. Oddiy register + login → MongoDB da user hosil bo'lishi
4. Leaderboard ochilishi → BOSHQA akkauntdan ham ko'rinishi (turli browserda)
5. Audio upload → transkripsiya → 1 kun TTL amalga oshishi
6. Google auth (agar Client ID kiritilgan bo'lsa):
   - Google bilan kirish → user yaratilishi → MongoDB da `googleId` bilan saqlanishi
   - Takroriy Google kirish → user topilishi (yangi yaratilmasligi)

## Risks

- **Risk 1**: API ishlamay qolsa (server yiqilsa) — userlarning lokal ma'lumotlari yo'qolmasligi kerak.  
  **Handling**: storage.ts da fetch catch qilganda localStorage fallback ishlaydi.
- **Risk 2**: Google token verify HTTP so'rov sekin bo'lishi.  
  **Handling**: tokeninfo endpointni timeout bilan chaqirish, cache (qisqa vaqtga, masalan 5 daqiqa — keyinchalik qo'shiladi).
- **Risk 3**: Oldindan mavjud bo'lgan localStorage userlariga nima bo'ladi?  
  **Handling**: Migration yozamiz: getCurrentUser() da user `id` Mongo formatda emas bo'lsa → backendga POST qilishni urinmasin, userni logout qilip yangisini login/register qilishini so'rash kerak. Yoki osonroq: eski userlarni avtomatik migratsiya qilmasdan, foydalanuvchini "Serverga ko'chish" uchun qayta register qilishga undaymiz.
- **Risk 4**: User type mismatch (passwordHash oldin required edi, endi optional).  
  **Handling**: types.ts da passwordHash ni optional qilamiz va Login.tsxda local va API moslash.

