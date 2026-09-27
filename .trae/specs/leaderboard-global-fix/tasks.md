# Implementation Tasks: Leaderboard Global Fix

Har bir task — `pending` → `in_progress` → `completed`. Dependency bo'yicha tartiblangan.

---

## Task 1: Vite configga `/api/*` proxy qo'shish

- **Priority**: high
- **Status**: pending
- **AC Coverage**: rule AC-1
- **Description**: `vite.config.ts` ni o'zgartirib, `server.proxy` obyektini qo'sh. `/api` → `http://localhost:5000`, `changeOrigin: true`. Bu dev rejimda frontend API so'rovlarini Express serverga yuborishiga imkon beradi.
- **Read-first paths**: [vite.config.ts](file:///c:/Users/Acer/Desktop/typscript/vite.config.ts)
- **Output contract**: `vite.config.ts` o'zgartirilgan; `defineConfig({ ... plugins: [react()], server: { proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } } } })`.
- **Test Requirements**:
  - **rule TR-1.1**: `vite.config.ts` ni Read qilganda `server.proxy['/api']` mavjud va target localhost:5000.
- **Completion Evidence**: File Read natijasi.

---

## Task 2: Serverga `PATCH /api/users/:userId` qo'shish

- **Priority**: high
- **Status**: pending
- **AC Coverage**: rule AC-9
- **Description**: `server/index.js` ga PATCH `/api/users/:userId` endpointini qo'sh. U firstName, lastName va (ixtiyoriy) password ni qabul qiladi. Password kelsa bcrypt hash qilish. Natijada yangilangan user JSON qaytariladi. project_memory da ko'rsatilgan endpoint — hozir mavjud emas.
- **Read-first paths**: [server/index.js](file:///c:/Users/Acer/Desktop/typscript/server/index.js)
- **Output contract**:
  - `app.patch('/api/users/:userId', async (req, res) => { ... })` qo'shiladi.
  - Body: `{ firstName?, lastName?, password? }`.
  - Agar email o'zgartirilmoqchi bo'lsa — block qilamiz (hozircha email o'zgartirishga yo'q, shoshilinch emas).
  - User topilmasa 404, saqlanmasa 500.
- **Test Requirements**:
  - **rule TR-2.1**: server/index.js da patch route mavjudligi.
  - **rule TR-2.2**: curl/Postman orqali PATCH qilganda user.firstName o'zgarishi.
- **Completion Evidence**: Code Read + endpointni `/api/users/:userId` orqali manual tekshirish (agar server bo'lsa) yoki code inspection.

---

## Task 3: `storage.ts` ga API-first wrapper layer yaratish (ENG KATTA TASK)

- **Priority**: high
- **Status**: pending
- **AC Coverage**: rule AC-2, AC-3, AC-5, AC-6, AC-7, AC-8 (qisman); rubric AC-11, AC-12
- **Description**: `storage.ts` ni qayta yoz — barcha export qilingan funksiyalar endi **avval API dan** urinib, xato bo'lsa eski localStorage logic'iga fallback qiladi.
  - Funksiyalar: `registerUser`, `loginUser`, `savePendingAudio`, `getPendingAudio`, `clearPendingAudio`, `addRecord`, `getRecord`, `updateRecord`, `getRecords`, `getUserRecords`, `getLeaderboard`, `recalcUserTotalWords`, `hasSeenTelegramModal`, `markTelegramModalSeen`, `setCurrentUser`, `getCurrentUser`, `buildEditTempId`, `linkTempIdToRecord`.
  - **Amaliy pattern** (har bitta API function uchun):
    1. `try` ichida `fetch('/api/...', { ... body, headers })` ni `AbortSignal.timeout(4000)` bilan chaqir.
    2. Agar response.ok (`status 200-299`) bo'lsa → JSON parse, agar `{ok: true}` bo'lsa → API natijasini qaytar (va kerak bo'lsa localStorage'ni sinxronlab qo'y: masalan, API orqali register bo'lsa user ni ham localStorage'ga setCurrentUser qilishni davom ettirish — shunda UI o'zgarishsiz ishlaydi).
    3. Agar response **4xx** bo'lsa — bu business error (noto'g'ri parol, mavjud email). Fallback ga o'tmang, `{ ok: false, error }` shaklida qaytar.
    4. Agar response **5xx** yoki `fetch` o'zi throw qilgan bo'lsa (TypeError: network, AbortError timeout) → eski localStorage logic'iga fallback qil, natijani localStorage'dan qaytar.
    5. Har bir API function'larda TypeScript return type eski type bilan mos bo'lishi kerak (komponentlarni o'zgartirmaslik uchun).
  - **Alohida**:
    - `savePendingAudio(file)`: agar API POST `/api/upload/audio` (FormData) muvaffaqiyatli bo'lsa → serverdagi `url: /api/audio/:tempId` ishlatiladi. Lokal mode esa `URL.createObjectURL + sessionStorage` (eski).
    - `getLeaderboard()`: API `GET /api/leaderboard` dan `users` array ni ol. Fallback localStorage getUsers() + sort.
  - Eski function nomlari, argumentlari va return shakllari **saqlanishi** kerak — bu komponentlarni (Login, Transcribe, …) deyarli o'zgartirmaslik uchun.
- **Read-first paths**: [src/storage.ts](file:///c:/Users/Acer/Desktop/typscript/src/storage.ts), [src/types.ts](file:///c:/Users/Acer/Desktop/typscript/src/types.ts)
- **Output contract**: `storage.ts` dagi barcha public API exportlari moslashgan; internal local helperlar (getUsers, saveUsers, simpleHash, passwordHash/Verify, PENDING_AUDIO_*) saqlanib qoladi (fallback uchun).
- **Test Requirements**:
  - **rule TR-3.1**: `storage.ts` ni grep qilganda kamida 8 ta `fetch(` ishlatilgan (register, login, upload/pending, records 4 ta CRUD, leaderboard, telegram 2 ta — jami 10+ ta).
  - **rule TR-3.2**: Har bir fetch da `signal: AbortSignal.timeout(4000)` yoki shu kabi timeout mavjud.
  - **rule TR-3.3**: 4xx (masalan, 401, 409) → `{ ok: false, error }` qaytariladi, localStorage ga o'tmaydi.
  - **rubric TR-3.4** (Toza error handling, 0-2): ≥ 1. Toza try/catch, response.json() safe, null/undefined check.
- **Completion Evidence**: Code Read + TypeScript `tsc --noEmit` pass.

---

## Task 4: Komponentlarni moslash — minimal o'zgarishlar (agar kerak bo'lsa)

- **Priority**: medium
- **Status**: pending
- **AC Coverage**: rule AC-2, AC-3, AC-4
- **Description**: Task 3 tugagandan keyin — Login, Dashboard, Leaderboard, History, Profile, Transcribe, App, TelegramModal komponentlarini tekshir. Ular `storage.ts` funksiyalarini ishlatayotgani uchun aks holda o'zgartirish kerak emas. Lekin:
  - `Login.tsx` dagi `getUsers().some(...)` (L52-54) registerdan oldin lokal email mavjudligini tekshiradi — bu kerak, lekin agar API ishlayotgan bo'lsa, API 409 qaytaradi va Login avval API xatosi bilan to'xtaydi. Yaxshi — bu local check ni saqlab qolsa ham bo'ladi (client-side early fail). Hech qanday o'zgarish shart emas, lekin agar TS warning bo'lsa to'g'rilash.
  - `Profile.tsx` dagi `handleDeleteAccount` hozircha to'liq local — API ga ulanish shart emas (hozircha delete endpoint yo'q; agar vaqt bo'lsa qo'sh, lekin task 4 diqqat markazida emas); maqsadimiz leaderboard global qilish, delete account local qolishi mumkin.
  - `App.tsx` dagi `hasSeenTelegramModal(user.id)` → Task 3 da API-first qilindi, shuning uchun o'zgartirish kerak emas.
- **Read-first paths**: Har bir komponent (Login, Leaderboard, Dashboard, History, Profile, Transcribe, TelegramModal, App)
- **Output contract**: Komponentlarda TS error bo'lmasligi; kerak bo'lsa minimal type castlar.
- **Test Requirements**:
  - **rule TR-4.1**: `src/components/*.tsx` fayllarida hech qanday `fetch(` yo'q (API abstraction saqlangan — rubric AC-11 uchun).
  - **rule TR-4.2**: Build (tsc) error yo'q.
- **Completion Evidence**: `grep fetch src/components/*.tsx` → hech narsa topilmasligi; build log.

---

## Task 5: Build va manual test — to'liq verification

- **Priority**: high
- **Status**: pending
- **AC Coverage**: rule AC-10; barcha rule AC larni yakuniy verification
- **Description**:
  1. `npm run build` ni ishga tushir — TS strict mode + Vite build (error bo'lmasligi kerak).
  2. (Iloji boricha) `npm run start:full` (ikkala server) →
     - Yangi 2 ta user yarating (2 ta brauzer/incognito).
     - User1: 1 audio + 50 so'z yoz → save → chiqish.
     - User2: 1 audio + 30 so'z → save → Leaderboard'ga o't.
     - Leaderboardda 2 ta user ham ko'rinishi kerak.
     - Serverni to'xtatib, offline rejimni sinab ko'r (login, save, leaderboard ishlashi kerak).
- **Test Requirements**:
  - **rule TR-5.1**: `npm run build` exit code 0, error yo'q.
  - **rule TR-5.2**: (Manual) Ikki brauzer orqali AC-4 sinovi → pass.
  - **rule TR-5.3**: (Manual) Server o'chirilganda AC-6 → pass.
- **Completion Evidence**: Build stdout + (agar ijro etilsa) skrinshotlar yoki test qaydnomasi.

---

## Task 6 (Optional, low priority): Eski localStorage userlarni backend'ga sinxron qilish

- **Priority**: low
- **Status**: pending (cancelled deb userdan approval olinmaguncha)
- **AC Coverage**: open-question 1 (agar rozilik berilsa)
- **Description**: Login/register paytida, agar user DB da yo'q, lekin localStorage da bor → uni backend'ga POST qilish. Lekin bu spec da default **cancelled** — userdan so'ralmagan.
- **Default**: Cancel qilinadi (Approval user tomonidan berilmasa).
