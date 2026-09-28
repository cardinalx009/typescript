import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

export type Lang = 'uz' | 'en';

const LANG_KEY = 'ks_lang';

const uz = {
  brandName: 'KING SCHOOL',
  brandSub: 'Learning Center',

  navHome: 'Bosh sahifa',
  navSubjects: 'Fanlar',
  navCourses: 'Kurslar',
  navContacts: 'Aloqa',
  navLogin: 'Kirish',
  navSignup: "Ro'yxatdan o'tish",
  navLogout: 'Chiqish',
  navTypescript: 'Typescript',
  navFullMock: 'Full mock',
  navSections: 'Bo\'limlar',
  navMenu: 'Menyu',

  subjectEnglish: 'Ingliz tili',
  subjectNative: 'Ona tili',
  subjectBiology: 'Biologiya',
  subjectChemistry: 'Kimyo',

  courseEnglish: 'Ingliz tili',
  courseNative: 'Ona tili',
  courseScience: 'Biologiya va Kimyo',

  heroBadge: 'Zamonaviy ta\'lim markazi',
  heroTitle: 'King School Learning Center',
  heroText:
    'Ingilis tili, ona tili, biologiya va kimyo fanlarini professional darajada o\'rganish uchun zamonaviy ta\'lim muhiti. Kirish va boshlang.',
  heroCtaSignup: 'Boshlang',
  heroCtaSubjects: 'Fanlar haqida',
  heroStatCourses: 'ta fan',
  heroStatAccess: 'soat online',
  heroStatOnline: 'onlayn platforma',

  subjectsTitle: 'Fanlarimiz',
  subjectsText:
    'Har bir fan uchun alohida tayyor dasturlar, mashqlar va o\'qituvchi nazorati.',
  subjectOpen: 'Batafsil',

  englishDesc:
    'Listening, Speaking, Grammar va Writing bo\'limlari. Audio yozib olish va matn yozish orqali eshitish ko\'nikmasini rivojlantirish.',
  englishTopic1: 'Listening mashqlari',
  englishTopic2: 'Grammar darslari',
  englishTopic3: 'Vocabulary',
  englishTopic4: 'Mock imtihonlar',
  englishGoTyping: 'Typescript bo\'limiga o\'tish',
  englishGoMock: 'Full mock test',
  englishNote:
    'Typescript va Full mock bo\'limlari faqat ro\'yxatdan o\'tgan foydalanuvchilarga ochiladi.',

  nativeDesc:
    'Ona tilida grammatika, she\'riyat va tahlil. Matn yozish, so\'z boyligi va adabiyot darslari.',
  nativeTopic1: 'Grammatika va morfologiya',
  nativeTopic2: 'Badiiy matn tahlili',
  nativeTopic3: 'She\'riyat va she\'r',
  nativeTopic4: 'Nutq madaniyati',

  bioDesc:
    'Biologiya fanidan hujjatli, sxematik va sodda tildagi darslar. Maktab dasturi va imtihonga tayyorgarlik.',
  bioTopic1: 'Molekulyar biologiya',
  bioTopic2: 'Genetika va seleksiya',
  bioTopic3: 'O\'simliklar va hayvonot',
  bioTopic4: 'Tibbiy biologiya',
  chemDesc:
    'Kimyo fanidan nazariy va amaliy mashqlar. Reaksiyalar, hisob-kitoblar va laboratoriya tajribalari.',
  chemTopic1: 'Mavjudot tuzilishi',
  chemTopic2: 'Reaksiyalar va tenglamalar',
  chemTopic3: 'Organik kimyo',
  chemTopic4: 'Laboratoriya ishlari',

  courseFormTitle: 'Kursga yozilish',
  courseFormText: 'Formani to\'ldiring, administrator siz bilan bog\'lanadi.',
  courseName: 'Ism familiya',
  coursePhone: 'Telefon raqam',
  courseAge: 'Yosh',
  courseCourse: 'Kurs',
  courseNote: 'Izoh',
  courseNotePh: 'Qanday maqsad bilan o\'qimoqchisiz?',
  courseSubmit: 'Yuborish',
  courseSending: 'Yuborilmoqda...',
  courseSuccess: 'Arizangiz qabul qilindi! Tez orada bog\'lanamiz.',
  courseErrName: 'Ismni kiriting',
  courseErrPhone: 'Telefon raqamni kiriting',
  courseErrCourse: 'Kursni tanlang',
  courseErrGeneric: 'Xatolik yuz berdi. Qayta urinib ko\'ring.',

  featuresTitle: 'Nega King School?',
  featuresText: 'Bizning afzalliklarimiz sizning natijangizga ta\'sir qiladi.',
  feature1Title: 'Zamonaviy platforma',
  feature1Text: 'Audio yozish, matn kiritish va statistika — barchasi bitta joyda.',
  feature2Title: 'Malakali o\'qituvchilar',
  feature2Text: 'Har bir fan bo\'yicha tajribali va shaffof usullar bilan dars beramiz.',
  feature3Title: 'Shaxsiy yondashuv',
  feature3Text: 'Guruh va individual mashqlar orqali har bir o\'quvchi tezligida ishlaydi.',
  feature4Title: 'Natija nazorati',
  feature4Text: 'Yozilgan so\'zlar, reyting va tarix orqali o\'sishni kuzating.',

  ctaTitle: 'Bugunroq boshlang',
  ctaText: 'Bepul ro\'yxatdan o\'ting va o\'z bo\'limingizga kiring.',
  ctaButton: "Ro'yxatdan o'tish",

  stepsTitle: 'Qanday ishlaydi?',
  stepsText: 'Uch qadamda o\'quv boshlashdan natijagacha.',
  step1Title: 'Ro\'yxatdan o\'ting',
  step1Text: 'Akkaunt yarating yoki Google orqali bir qadamda kiring.',
  step2Title: 'Fan va bo\'limni tanlang',
  step2Text: 'Ingliz tili, ona tili, biologiya yoki kimyo kursini tanlang.',
  step3Title: 'Mashq qiling va natijani ko\'ring',
  step3Text: 'Audio yozing, matn kiriting, reyting va tarix orqali o\'sishni kuzating.',

  teachersTitle: 'Nima uchun King School?',
  teachersText: 'Biz jamoa, metodika va texnologiyani bitta joyda birlashtirdik.',
  benefit1Title: 'Malakali ustozlar',
  benefit1Text: 'Ingliz tili, biologiya va kimyo fanidan tajribali mutaxassislar.',
  benefit2Title: 'Zamonaviy platforma',
  benefit2Text: 'Audio yozish, avtomatik matn va statistika bir joyda.',
  benefit3Title: 'Shaffof natija',
  benefit3Text: 'Leaderboard va tarix orqali o\'sishni real vaqtda kuzating.',
  benefit4Title: 'Qulay vaqt',
  benefit4Text: '24/7 kirish — qachon bo\'lsa ham mashq qila olasiz.',

  contactTitle: 'Biz bilan bog\'laning',
  contactText: 'Savollaringiz bormi? Kursga yozilish yoki maslahat uchun aloqaga o\'ting.',
  contactPhone: 'Telefon',
  contactAddress: 'Manzil',
  contactHours: 'Ish vaqti',
  contactHoursValue: 'Har kuni 09:00 – 21:00',
  contactCta: 'Kursga yozilish',

  marquee1: 'IELTS',
  marquee2: 'CEFR',
  marquee3: 'Listening',
  marquee4: 'Speaking',
  marquee5: 'Grammar',
  marquee6: 'Vocabulary',
  marquee7: 'Biologiya',
  marquee8: 'Kimyo',
  marquee9: 'Mock imtihon',
  marquee10: 'Reyting',

  fullMockTitle: 'Full Mock',
  fullMockText:
    'Listening va Reading testlarini tanlang. Har bir testni ochish uchun ustiga bosing.',
  mockListening: 'Listening',
  mockReading: 'Reading',
  mockNoFiles: 'Hozircha fayl yuklanmagan',
  mockClose: 'Yopish',
  mockUploaded: 'Yuklandi',

  authLoginTitle: 'Hisobga kirish',
  authRegisterTitle: 'Ro\'yxatdan o\'tish',
  authFirstName: 'Ism',
  authLastName: 'Familya',
  authEmail: 'Email',
  authPassword: 'Parol',
  authConfirm: 'Parolni tasdiqlang',
  authLoginBtn: 'Kirish',
  authRegisterBtn: "Ro'yxatdan o'tish",
  authOr: 'yoki',
  authGoogle: 'Google bilan davom etish',
  authGoogleOff: 'Google kirish hozircha mavjud emas',
  authNoAccount: 'Hisobingiz yo\'qmi?',
  authHasAccount: 'Hisobingiz bormi?',
  authBackHome: 'Bosh sahifaga qaytish',
  authLoading: 'Kutilmoqda...',

  formErrEmail: 'To\'g\'ri email kiriting',
  formErrPassword: 'Parolni kiriting',
  formErrName: 'Ism va familiyani kiriting',
  formErrShort: 'Parol kamida 4 ta belgi bo\'lsin',
  formErrMatch: 'Parollar mos emas',
  formErrExists: 'Bu email mavjud. Iltimos login qiling.',
  formErrGeneric: 'Xatolik yuz berdi',

  footerAbout:
    'King School — zamonaviy ta\'lim markazi. Inglis tili, ona tili, biologiya va kimyo fanlarida onlayn va ofis darslari.',
  footerLinks: 'Tezkor havolalar',
  footerContacts: 'Bog\'lanish',
  footerTelegram: 'Telegram kanal',
  footerRights: 'Barcha huquqlar himoyalangan.',
  footerDev: 'King School platformasi',

  notFoundTitle: 'Sahifa topilmadi',
  notFoundText: 'Siz izlagan sahifa mavjud emas.',
  notFoundBtn: 'Bosh sahifa',
} as const;

export type TKey = keyof typeof uz;

const en: Record<TKey, string> = {
  brandName: 'KING SCHOOL',
  brandSub: 'Learning Center',

  navHome: 'Home',
  navSubjects: 'Subjects',
  navCourses: 'Courses',
  navContacts: 'Contact',
  navLogin: 'Sign in',
  navSignup: 'Sign up',
  navLogout: 'Sign out',
  navTypescript: 'Typescript',
  navFullMock: 'Full mock',
  navSections: 'Sections',
  navMenu: 'Menu',

  subjectEnglish: 'English',
  subjectNative: 'Mother tongue',
  subjectBiology: 'Biology',
  subjectChemistry: 'Chemistry',

  courseEnglish: 'English',
  courseNative: 'Mother tongue',
  courseScience: 'Biology and Chemistry',

  heroBadge: 'Modern learning center',
  heroTitle: 'King School Learning Center',
  heroText:
    'A modern learning environment to master English, mother tongue, biology and chemistry with professional methods. Register and get started.',
  heroCtaSignup: 'Get started',
  heroCtaSubjects: 'About subjects',
  heroStatCourses: 'subjects',
  heroStatAccess: 'hours online',
  heroStatOnline: 'online platform',

  subjectsTitle: 'Our subjects',
  subjectsText:
    'Every subject has its own program, exercises and teacher supervision.',
  subjectOpen: 'Learn more',

  englishDesc:
    'Listening, Speaking, Grammar and Writing. Record audio and type transcripts to improve your listening skills.',
  englishTopic1: 'Listening exercises',
  englishTopic2: 'Grammar lessons',
  englishTopic3: 'Vocabulary',
  englishTopic4: 'Mock exams',
  englishGoTyping: 'Open Typescript section',
  englishGoMock: 'Full mock test',
  englishNote:
    'Typescript and Full mock sections are available for registered users only.',

  nativeDesc:
    'Mother tongue grammar, poetry and analysis: writing, vocabulary and literature lessons.',
  nativeTopic1: 'Grammar and morphology',
  nativeTopic2: 'Literary text analysis',
  nativeTopic3: 'Poetry and verse',
  nativeTopic4: 'Speech culture',

  bioDesc:
    'Biology lessons explained clearly with diagrams and examples. School curriculum and exam preparation.',
  bioTopic1: 'Molecular biology',
  bioTopic2: 'Genetics and selection',
  bioTopic3: 'Plants and animals',
  bioTopic4: 'Medical biology',
  chemDesc:
    'Chemistry theory and practice: reactions, calculations and laboratory work.',
  chemTopic1: 'Atomic structure',
  chemTopic2: 'Reactions and equations',
  chemTopic3: 'Organic chemistry',
  chemTopic4: 'Lab practice',

  courseFormTitle: 'Course registration',
  courseFormText: 'Fill in the form and our administrator will contact you.',
  courseName: 'Full name',
  coursePhone: 'Phone number',
  courseAge: 'Age',
  courseCourse: 'Course',
  courseNote: 'Note',
  courseNotePh: 'Why do you want to study?',
  courseSubmit: 'Send',
  courseSending: 'Sending...',
  courseSuccess: 'Your request has been received! We will contact you soon.',
  courseErrName: 'Please enter your name',
  courseErrPhone: 'Please enter your phone number',
  courseErrCourse: 'Please choose a course',
  courseErrGeneric: 'Something went wrong. Please try again.',

  featuresTitle: 'Why King School?',
  featuresText: 'Our advantages directly affect your results.',
  feature1Title: 'Modern platform',
  feature1Text: 'Audio recording, transcription and statistics in one place.',
  feature2Title: 'Qualified teachers',
  feature2Text: 'Experienced specialists with transparent methods for each subject.',
  feature3Title: 'Personal approach',
  feature3Text: 'Group and individual practice so every student works at their own pace.',
  feature4Title: 'Progress control',
  feature4Text: 'Track your growth with word counts, rating and history.',

  ctaTitle: 'Start today',
  ctaText: 'Register for free and enter your personal section.',
  ctaButton: 'Sign up',

  stepsTitle: 'How it works?',
  stepsText: 'From starting to results in three steps.',
  step1Title: 'Sign up',
  step1Text: 'Create an account or continue with Google in one click.',
  step2Title: 'Pick a subject',
  step2Text: 'Choose English, native language, biology or chemistry.',
  step3Title: 'Practise and see results',
  step3Text: 'Record audio, add the text and track growth with rating and history.',

  teachersTitle: 'Why King School?',
  teachersText: 'We brought teachers, methodology and technology together in one place.',
  benefit1Title: 'Qualified teachers',
  benefit1Text: 'Experienced specialists in English, biology and chemistry.',
  benefit2Title: 'Modern platform',
  benefit2Text: 'Audio recording, automatic text and statistics in one place.',
  benefit3Title: 'Transparent results',
  benefit3Text: 'Track your real progress with the leaderboard and history.',
  benefit4Title: 'Flexible time',
  benefit4Text: '24/7 access — practise whenever you want.',

  contactTitle: 'Get in touch',
  contactText: 'Have questions? Contact us to sign up for a course or get advice.',
  contactPhone: 'Phone',
  contactAddress: 'Address',
  contactHours: 'Working hours',
  contactHoursValue: 'Every day 09:00 – 21:00',
  contactCta: 'Sign up for a course',

  marquee1: 'IELTS',
  marquee2: 'CEFR',
  marquee3: 'Listening',
  marquee4: 'Speaking',
  marquee5: 'Grammar',
  marquee6: 'Vocabulary',
  marquee7: 'Biology',
  marquee8: 'Chemistry',
  marquee9: 'Mock exam',
  marquee10: 'Rating',

  fullMockTitle: 'Full Mock',
  fullMockText:
    'Choose a Listening or Reading test. Click any test to open it.',
  mockListening: 'Listening',
  mockReading: 'Reading',
  mockNoFiles: 'No files uploaded yet',
  mockClose: 'Close',
  mockUploaded: 'Uploaded',

  authLoginTitle: 'Sign in',
  authRegisterTitle: 'Create an account',
  authFirstName: 'First name',
  authLastName: 'Last name',
  authEmail: 'Email',
  authPassword: 'Password',
  authConfirm: 'Confirm password',
  authLoginBtn: 'Sign in',
  authRegisterBtn: 'Sign up',
  authOr: 'or',
  authGoogle: 'Continue with Google',
  authGoogleOff: 'Google sign-in is not available yet',
  authNoAccount: "Don't have an account?",
  authHasAccount: 'Already have an account?',
  authBackHome: 'Back to home',
  authLoading: 'Please wait...',

  formErrEmail: 'Enter a valid email',
  formErrPassword: 'Enter your password',
  formErrName: 'Enter first and last name',
  formErrShort: 'Password must be at least 4 characters',
  formErrMatch: 'Passwords do not match',
  formErrExists: 'This email already exists. Please sign in.',
  formErrGeneric: 'Something went wrong',

  footerAbout:
    'King School is a modern learning center offering online and offline classes in English, mother tongue, biology and chemistry.',
  footerLinks: 'Quick links',
  footerContacts: 'Contact',
  footerTelegram: 'Telegram channel',
  footerRights: 'All rights reserved.',
  footerDev: 'King School platform',

  notFoundTitle: 'Page not found',
  notFoundText: 'The page you are looking for does not exist.',
  notFoundBtn: 'Go home',
};

const dict: Record<Lang, Record<TKey, string>> = { uz, en };

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: 'uz',
  setLang: () => {},
  t: (key) => uz[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' || saved === 'uz' ? saved : 'uz';
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.title =
      lang === 'en'
        ? 'King School Learning Center — English, Biology, Chemistry'
        : 'King School Learning Center — Ingliz tili, Biologiya, Kimyo';
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (key: TKey) => dict[lang][key] ?? uz[key],
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
