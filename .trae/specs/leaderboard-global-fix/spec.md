# Spec: Leaderboard Global Fix va Frontend↔Backend Ulanishi

## Muammo

Loyihada backend API endpointlari to'liq yozilgan (`server/index.js` ichida MongoDB bilan ishlaydigan), lekin frontend komponentlarining **barchasi** to'g'ridan-to'g'ri `storage.ts` ichidagi **localStorage** funksiyalaridan foydalanmoqda. Natijada:

- Foydalanuvchi birinchi akaunt ochadi → ma'lumotlar *shu brauzerning* localStorage'iga yoziladi
- Akauntdan chiqib, yangi akaunt ochadi → yana shu *brauzerning* localStorage'iga yoziladi
- Leaderboard esa faqat shu localStorage'dan o'qiladi → **faqat bitta brauzerda ro'yxatdan o'tgan userlar ko'rinadi**
- Ikkinchi brauzer/devays dan kirilsa, u yerda umuman boshqa userlar bo'ladi — global reyting umuman ishlamayapti

Shuningdek:
- `vite.config.ts` da `/api/*` proxy yo'q, shuning uchun dev rejimida frontend to'g'ridan-to'g'ri 5000-portdagi Express serveriga so'rov yubora olmaydi.

## Foydalanuvchilar (Users)

- **O'quvchilar**: Ro'yxatdan o'tgan, audio tinglab matn yozuvchi foydalanuvchilar. Ular o'z akkauntlarini yaratganda va matn saqlaganda, barcha turgan qurilmalarda leaderboardda o'zlarini va boshqalarni ko'ra olishlari kerak.
- **O'qituvchi/Admin**: Loyihaning King School brendi bilan ishlaydigan nazoratchisi (hozircha ro'l modeli yo'q, faqat global leaderboard ko'rinishi yetarli).

## Maqsadlar (Goals)

1. **Leaderboard global bo'lsin**: Har qanday brauzer/devays da ro'yxatdan o'tgan *barcha* userlar MongoDB'dan olinib, leaderboardda ko'rsatilishi kerak.
2. **Auth global bo'lsin**: Bir qurilmada ro'yxatdan o'tgan user boshqa qurilmadan login qila olishi kerak (MongoDB orqali).
3. **Records global bo'lsin**: Saqlangan transkriptlar (tarix) userning barcha qurilmalarida ko'rinishi kerak.
4. **Offline fallback saqlanib qolsin**: Agar server ishlamasa (mashqasiz, offline, xato), frontend avtomatik ravishda eski localStorage rejimiga qaytishi kerak — foydalanuvchi biron narsani yo'qotmasligi kerak (project_memory dagi qoidaga muvofiq).
5. **Auto-save, TTL (1 kun), davom ettirish funksiyalari buzilmasin**: API rejimida ham 450ms debounce, 3.5 soniyalik progress save va 24 soat TTL aynan eski kabi ishlashi kerak.

## Qiziqmasliklar (Non-Goals)

- Yangi UI funksiyalar qo'shish emas (faqat mavjud API'ga ulanish)
- Google Auth qo'shish emas (bu keyingi ish, hozircha parol bilan yetarli)
- Audio fayllarni S3/Cloudinary'ga ko'chirish emas (hozircha MongoDB Buffer + localStorage blob URL davom etadi; bu alohida ticket)
- Real-time websocket yordamida leaderboardni live yangilash emas — oddiy page-load + setInterval bilan yetarli

## Funktsional Talablar (Functional Requirements)

### FR-1: Vite Dev Proxy
- `vite.config.ts` ga `/api/*` so'rovlarini `http://localhost:5000` ga proxy qiluvchi konfiguratsiya qo'shilishi kerak.

### FR-2: Auth (Login + Register) API-ga ulanishi
- `registerUser()` funksiyasi avval `POST /api/auth/register` ga so'rov yuborishi kerak.
- `loginUser()` funksiyasi avval `POST /api/auth/login` ga so'rov yuborishi kerak.
- Agar API 200+ `ok:true` qaytarsa, natijani ishlatish; network xatosi yoki 5xx bo'lsa, localStorage fallback'iga o'tish kerak.
- Agar API 4xx qaytarsa (masalan, parol noto'g'ri yoki email mavjud), **fallback'ga o'tmasdan** — xatoni foydalanuvchiga ko'rsatish kerak (business logic error).

### FR-3: Audio Upload (PendingAudio) API-ga ulanishi
- `savePendingAudio()` funksiyasi avval `POST /api/upload/audio` ga FormData orqali faylni jo'natishi kerak.
- Muvaffaqiyatli bo'lsa, serverdan qaytgan `url: /api/audio/:tempId` dan foydalanish; xatolik bo'lsa, `URL.createObjectURL` + localStorage/sessionStorage bilan eski naqshni davom ettirish.
- `getPendingAudio()` avval `GET /api/pending/:tempId` so'rovi bilan tekshirish kerak.

### FR-4: Audio Records (CRUD) API-ga ulanishi
- `addRecord()` → avval `POST /api/records`, fail → localStorage add
- `getRecord()` → avval `GET /api/records/:id`, fail → localStorage get
- `updateRecord()` → avval `PATCH /api/records/:id`, fail → localStorage update
- `getUserRecords()` → avval `GET /api/users/:userId/records`, fail → localStorage getUserRecords (TTL filteri ikkala tomonda ham ishlashi kerak)
- Har bir holatda: 4xx → error; network/5xx → fallback.

### FR-5: Leaderboard API-ga ulanishi (ENG KOMIL FOYDALANUVCHI TALABI)
- `getLeaderboard()` funksiyasi avval `GET /api/leaderboard` ga so'rov yuborishi kerak.
- Natija 200 `ok:true` bo'lsa, serverdan qaytgan userlar ro'yxatidan foydalanish **(bu yerda fallback yo'q deb emas — network xatosi bo'lsa localStorage ko'rsatilsin, lekin userga "Server bilan aloqa yo'q, lokal reyting ko'rsatilmoqda" degan badge chiqarish majburiy emas, balki fallback yaxshi)**.
- `Leaderboard.tsx` ichida local cache dan emas, har safar (yoki cache + refresh pattern'i bilan) API dan olish kerak; user totalWords (Dashboard'da ham) API dan kelgan qiymat asosida hisoblanishi kerak.

### FR-6: User Stats (recalcUserTotalWords) API bilan sinxron
- `recalcUserTotalWords()` local hol uchun mavjudligini saqlab qolish; API rejimida esa server o'zi `POST/PATCH records` da avtomatik recalc qiladi (server/index.js da allaqachon recalcUserTotalWords yozilgan — shuni ishlatamiz).

### FR-7: Telegram Modal API-ga ulanishi
- `hasSeenTelegramModal(userId)` → avval `GET /api/telegram/seen/:userId`, fail → localStorage
- `markTelegramModalSeen(userId)` → avval `POST /api/telegram/seen/:userId`, fail → localStorage

### FR-8: User Profile Edit endpoint
- Backend'da `PATCH /api/users/:userId` endpointi mavjudligini project_memory da eslatilgan. Hozir server/index.js da yo'q — uni qo'shish kerak (ism/familya va parolni almashtirish uchun).
- Frontendda `Profile.tsx` hozircha faqat localStorage orqali stat refresh qiladi; bu API ga ham ulanishi kerak yoki minimal — profile refresh ishlashi uchun API dan user ni qayta olish kerak.

## Funktsional Emas Talablar (Non-Functional Requirements)

### NFR-1: Offline First UX
- Har bir storage funktsiyasi uchun API → fallback chand 3-5 sekunddan ko'p kutmasligi kerak. Fetch timeout ≈ 4000ms bo'lsin; timeout bo'lsa darhol localStorage'ga o'tsin.
- UI da hech qachon "loading" abadiy qolmasligi kerak.

### NFR-2: Oldinga Moslik (Backward Compatibility)
- Avval localStorage'da ro'yxatdan o'tgan userlar (eski oddiy simpleHash parol) ham backend orqali login qila olishlari kerak — server/index.js da allaqachon `simpleHashMatch` mavjud, bu saqlanishi kerak.
- Eski `localStorage` dagi userlar to'g'ridan-to'g'ri API bilan ishlashini talab qilmaslik kerak: bu userlar backend'da mavjud bo'lmasa, login/register jarayonida avtomatik ravishda backend'ga ham sinxron bo'lishi kerak emas (kengroq sinxronizatsiya keyingi ish). Fallback ishlashi yetarli.

### NFR-3: Turli qatlamlarni aralashtirmaslik
- Barcha API chaqiruvlari `storage.ts` ichiga yopilgan holda bo'lsin — komponentlarda (Login, Leaderboard, Transcribe, …) `fetch` yo'q. Barchasi `storage.ts` dagi export qilingan funksiya orqali ishlaydi. Komponentlar o'zgarishlari minimal.

### NFR-4: Xavfsizlik
- Frontend tomonida parol hech qachon to'g'ridan-to'g'ri localStorage'ga saqlanmasligi kerak (hozirgi `passwordHash` holati saqlanadi — oddiy simpleHash + salt local uchun, bcrypt esa backend uchun). Hozirgi xatti-harakat buzilmasin.

### NFR-5: Build Xatoliklari Yo'q
- O'zgarishlardan so'ng `npm run build` (`tsc && vite build`) xatosiz muvaffaqiyatli o'tishi kerak.

## Cheklovlar (Constraints)

- Node.js ≥ 18 (package.json da yozilgan), Vite 5, React 18, TypeScript 5 strict mode — shu steka ichida qolish kerak, yangi package qo'shmaslik kerak (fetch build-in, shuning uchun axios va hokazo kerak emas).
- Project_memory dagi qoidalar:
  - Audio + transcript 1-kundan keyin o'chishi kerak (TTL), metadata (nomi + so'z soni) qoladi.
  - Left Shift shortcut desktop da, mobil da yo'q.
  - Registerda ism, familiya, email, parol majburiy. Login: email + parol.
  - Matn maydoni Times New Roman + 1.9 line-height.
  - Dizayn ko'k-oq sxema.
- Bularni hech biri buzilmasligi kerak.

## O'zgaruvchan Qabul-qilishlar (Assumptions)

- Foydalanuvchi dev vaqtida `npm run start:full` bilan ikkala serverni (Vite 5173 + Express 5000) ishga tushiradi; buni README ga yozish shart emas, lekin vite proxy shu holat uchun mo'ljallangan.
- Production deploy (Railway) uchun Vite static build + Express `dist/` serve qiladi; bu holatda proxy kerak emas (bir xil origin), bu eski kodda allaqachon ishlagan.
- `.env` faylida `MONGODB_URI` to'g'ri kiritilgan deb olinadi (hozirgi .env da bor).

## Ochiq Savollar (Open Questions)

1. **Q**: Oldin localStorage'da yaratilgan userlarni backend'ga sinxron qilish kerakmi? (Masalan, user login qilganda agar DB da bo'lmasa, uni backend'ga ham yuborish?)
   **Default javob (agar rozilik berilsa)**: Hozircha kerak emas. Avval localStorage'da bo'lgan user **fallback rejimida** davom etadi. Agar u keyinroq register qilsa (yangi email), DB ga tushadi. Keyingi ticket'da proper sinxronizatsiya qilish mumkin.

2. **Q**: Leaderboardni har render da API dan o'qlashmi yoki 60 sek caching qilib?
   **Default**: 60 sek kesh + component mount da yangilash. Ko'p so'rov DB ni yormasligi uchun.

---

## Qabul Mezonlari (Acceptance Criteria)

Har bir `AC` — yoki `rule` (ob'ektiv ha/yo'q), yoki `rubric` (baholanadigan).

### rule AC-1: Vite proxy mavjud
- **Kuzatuv**: `vite.config.ts` faylida `server.proxy` obyekti bor, `/api` kaliti mavjud va u `http://localhost:5000` ga ko'rsatadi; changeOrigin: true bo'lsa.
- **Evidence source**: `vite.config.ts` ni Read qilish.

### rule AC-2: Register API orqali ishlaydi
- **Kuzatuv**: Server ishlayotgan vaqtda yangi user ro'yxatdan o'tganda, MongoDB'da User document yaratilishi; user obyektining `id` si MongoDB ObjectId formatiga mos kelishi (24 hex character yoki string form).
- **Evidence source**: MongoDB kompass yoki `GET /api/leaderboard` natijasida yangi user ko'rinishi; browser DevTools Network panelida `POST /api/auth/register` 200 OK.

### rule AC-3: Login API orqali ishlaydi (ikki brauzer oraliq sinov)
- **Kuzatuv**: Bir brauzerda `UserA` register → keyin ikkinchi brauzerda (yoki incognito) `UserA` parol bilan login qilganda, hisob ochilishi. Agar 2chi brauzer oldin bu emailni localStorage'da ko'rmagan bo'lsa ham — API orqali login bo'lishi kerak.
- **Evidence source**: Ikki alohida brauzer profilida login muvaffaqiyatli; Network panelida `POST /api/auth/login` 200.

### rule AC-4: Leaderboard global ishlaydi (ENG KOMIL — asosiy user bug'ini bartaraf)
- **Kuzatuv**:
  1. Brauzer 1 → User1 register → bitta audio transcript yozib 50 so'z saqlash → chiqish.
  2. Brauzer 2 → User2 register → bitta audio 30 so'z saqlash → Leaderboard sahifasiga o'tish.
  3. User2 Leaderboard'da **ham User1, ham User2** ko'rinishi kerak. User1 ning 50 so'zi bilan 1-o'rin, User2 ning 30 so'zi bilan 2-o'rin.
- **Evidence source**: Ikki brauzerning Leaderboard screenshotlari (yoki Network `GET /api/leaderboard` response payloadida ikkala user ham borligi).

### rule AC-5: User totalWords statistikasi API orqali sinxron bo'ladi
- **Kuzatuv**: User1 transkriptga 100 so'z qo'shib saqlagandan keyin, Dashboard'dagi "Jami so'zlar" kartasi va Leaderboarddagi User1 ning totalWords qiymati bir xil bo'lishi (100 + oldingi qiymat).
- **Evidence source**: Dashboard totalWords vs `GET /api/leaderboard` dagi user.totalWords tengligi.

### rule AC-6: Offline fallback ishlaydi (server yopilgan)
- **Kuzatuv**: Express server to'xtatilgan (`npm run server` o'chirilgan) holda:
  1. Eski localStorage'dagi user login qilishi kerak — xato bermasligi.
  2. Audio yuklash + transcribe + save ishlashi kerak, ma'lumotlar localStorage'ga tushishi.
  3. Leaderboard localStorage'dan ko'rsatilishi kerak.
- **Evidence source**: Server o'chirilgan holda ham login → transcript → save → leaderboard ko'rish muvaffaqiyatli; console'da hech qanday "Uncaught" yo'q.

### rule AC-7: Transcribe'da avtomatik save + davom ettirish ishlaydi
- **Kuzatuv**: API rejimida (server ishlayotgan):
  - Matn yozganda 450ms dan keyin Network panelida `PATCH /api/records/:id` yoki `POST /api/records` so'rovi ko'rinishi.
  - Audio tinglayotganda har ~3.5 soniyada progressSeconds PATCH orqali yuborilishi.
  - History dan "Davom etish" bosilsa, audio `progressSeconds` dan boshlanishi.
- **Evidence source**: DevTools Network → Records PATCH/POST so'rovlari; Transcribe sahifasi qayta ochilganda audio progress tiklanishi.

### rule AC-8: 1 kunlik TTL ishlaydi (API + lokal)
- **Kuzatuv**: AudioRecord `expiresAt` 24 soatdan keyin:
  - Backend `/api/users/:userId/records` da `expiresAt: {$gt: now}` filteri tufayli expire bo'lgan recordlar qaytarilmasligi.
  - Frontend `getRecords()` da ham (fallback) filter ishlashi.
- **Evidence source**: server/index.js L268-278 (getUserRecords) tekshiruvi; storage.ts L88-98 tekshiruvi.

### rule AC-9: Profile PATCH endpoint mavjud (ism/familya yangilash)
- **Kuzatuv**: `server/index.js` da `PATCH /api/users/:userId` route mavjud; firstName, lastName ni (ixtiyoriy parolni ham) yangilashi kerak; user obyektini qaytarishi kerak.
- **Evidence source**: `server/index.js` ni Read qilish; Postman/curl bilan PATCH testi.

### rule AC-10: Typescript strict mode + build o'tadi
- **Kuzatuv**: `npm run build` (`tsc --noEmit` + `vite build`) exit code 0, TS error yo'q, dist/ papka yaratilgan.
- **Evidence source**: `RunCommand` orqali `npm run build` stdout/exitCode.

### rubric AC-11: Arxitektura tozaligi (API va lokalni aralashtirmaslik)
- **O'lchash**: 0-2. 
  - 0: Barcha fetch callar komponentlarga tarqalgan, storage.ts o'zgartirilmagan.
  - 1: Storage.ts'da API qo'shilgan, lekin ba'zi komponentlarda fetch'lar qolgan; yoki timeout/fallback xato xattirish yomon.
  - 2: Barcha API callar faqat `storage.ts` ichida; komponentlar ushbu funksiyalarni chaqirishadi; har bir funksiyada 4000ms timeout, 5xx/network → localStorage fallback, 4xx → error.
- **Pass threshold**: ≥ 2.
- **Evidence source**: `src/storage.ts`, component fayllarini (Login, Leaderboard, Transcribe, History, Profile, Dashboard) grep "fetch" yo'qligini tekshirish.

### rubric AC-12: Dasturchilik sifati (error handling)
- **O'lchash**: 0-2.
  - 0: try/catch yo'q, TypeError bo'lib qolishi mumkin (masalan, fetch null qaytarsa .json() chaqiriladi).
  - 1: Try/catch bor, lekin ba'zi joylarda `any` cast, loading state idda qolishi mumkin.
  - 2: Har bir fetch Response check, ok status check, JSON parse safe, oldingi state buzilmagan; userga xatolik xabari "try/catch all pattern" bilan beringan.
- **Pass threshold**: ≥ 1.
- **Evidence source**: Code review `storage.ts`.
