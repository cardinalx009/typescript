import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { SITE_PATHS, typingPath } from '../sitePaths';
import { SUBJECTS } from './subjects';
import { User } from '../types';

export default function Home({ user }: { user: User | null }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const heroImage =
    'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=abstract%20modern%20education%20background%2C%20deep%20navy%20blue%20gradient%2C%20geometric%20shapes%2C%20floating%20books%20and%20molecules%2C%20minimal%2C%20no%20text&image_size=landscape_16_9';

  const features = [
    { icon: '🖥', title: t('feature1Title'), text: t('feature1Text') },
    { icon: '🎓', title: t('feature2Title'), text: t('feature2Text') },
    { icon: '🤝', title: t('feature3Title'), text: t('feature3Text') },
    { icon: '📈', title: t('feature4Title'), text: t('feature4Text') },
  ];

  const steps = [
    { icon: '📝', title: t('step1Title'), text: t('step1Text') },
    { icon: '🧭', title: t('step2Title'), text: t('step2Text') },
    { icon: '🚀', title: t('step3Title'), text: t('step3Text') },
  ];

  const benefits = [
    { icon: '👨‍🏫', title: t('benefit1Title'), text: t('benefit1Text') },
    { icon: '⚙️', title: t('benefit2Title'), text: t('benefit2Text') },
    { icon: '📊', title: t('benefit3Title'), text: t('benefit3Text') },
    { icon: '🕐', title: t('benefit4Title'), text: t('benefit4Text') },
  ];

  const marquee = [
    t('marquee1'),
    t('marquee2'),
    t('marquee3'),
    t('marquee4'),
    t('marquee5'),
    t('marquee6'),
    t('marquee7'),
    t('marquee8'),
    t('marquee9'),
    t('marquee10'),
  ];

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 opacity-25">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/95 to-navy-800/90" />
        <div className="absolute inset-0 ks-grid-bg" aria-hidden />
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-navy-600/30 blur-3xl animate-float"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-navy-500/20 blur-3xl animate-float"
          style={{ animationDelay: '2.5s' }}
          aria-hidden
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <span className="animate-fade-down inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-navy-100 text-sm font-medium border border-white/15 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-300 animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300" />
              </span>
              {t('heroBadge')}
            </span>

            <h1 className="animate-fade-up mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight text-shimmer">
              {t('heroTitle')}
            </h1>

            <p
              className="animate-fade-up mt-5 text-base sm:text-lg text-navy-100/80 leading-relaxed"
              style={{ animationDelay: '0.12s' }}
            >
              {t('heroText')}
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: '0.2s' }}>
              {user ? (
                <>
                  <Link
                    to={typingPath()}
                    className="px-7 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-soft"
                  >
                    ⌨ {t('navTypescript')}
                  </Link>
                  <Link
                    to={SITE_PATHS.fullMock}
                    className="px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/10 transition-all hover:-translate-y-0.5"
                  >
                    {t('navFullMock')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={SITE_PATHS.signup}
                    className="px-7 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-soft"
                  >
                    {t('heroCtaSignup')}
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/10 transition-all hover:-translate-y-0.5"
                  >
                    {t('heroCtaSubjects')}
                  </button>
                </>
              )}
            </div>

            <div className="animate-fade-up mt-12 flex flex-wrap gap-8" style={{ animationDelay: '0.28s' }}>
              {[
                { value: '4', label: t('heroStatCourses') },
                { value: '24/7', label: t('heroStatAccess') },
                { value: '100%', label: t('heroStatOnline') },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="text-sm text-navy-200/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- MARQUEE ---------------- */}
      <div className="bg-navy-900 border-y border-white/10 py-4 overflow-hidden">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0">
              {marquee.map((m) => (
                <span
                  key={`${dup}-${m}`}
                  className="flex items-center gap-3 px-8 text-navy-200/70 text-sm font-semibold uppercase tracking-wider whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-navy-500" />
                  {m}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- SUBJECTS ---------------- */}
      <section id="subjects" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl animate-fade-up">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
            {t('subjectsTitle')}
          </h2>
          <p className="mt-3 text-slate-600">{t('subjectsText')}</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger">
          {SUBJECTS.map((s) => (
            <Link
              key={s.key}
              to={s.path}
              className={`group card-lift bg-white rounded-2xl overflow-hidden ring-1 ring-slate-200/70 hover:shadow-soft ${s.ring}`}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={s.image}
                  alt={t(s.nameKey)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-125">
                    {s.icon}
                  </span>
                  <span className="text-white font-bold text-lg">{t(s.nameKey)}</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 leading-relaxed">{t(s.descKey)}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 transition-all group-hover:gap-3.5">
                  {t('subjectOpen')} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- STEPS ---------------- */}
      <section className="bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl animate-fade-up">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              {t('stepsTitle')}
            </h2>
            <p className="mt-3 text-slate-600">{t('stepsText')}</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((st, idx) => (
              <div key={st.title} className="relative animate-fade-up" style={{ animationDelay: `${idx * 0.14}s` }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 text-white flex items-center justify-center text-2xl shadow-soft">
                    {st.icon}
                  </div>
                  <div className="text-5xl font-extrabold text-slate-200 leading-none">
                    0{idx + 1}
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-bold text-navy-900">{st.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{st.text}</p>
                {idx < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-7 left-[4.25rem] right-0 h-px bg-gradient-to-r from-navy-200 to-transparent"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl animate-fade-up">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
            {t('featuresTitle')}
          </h2>
          <p className="mt-3 text-slate-600">{t('featuresText')}</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-lift p-6 rounded-2xl bg-white border border-slate-200/70 hover:border-navy-300 hover:shadow-soft"
            >
              <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center text-xl">
                {f.icon}
              </div>
              <h3 className="mt-4 font-bold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- WHY US (DARK) ---------------- */}
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 ks-grid-bg" aria-hidden />
        <div
          className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-navy-600/20 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl animate-fade-up">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t('teachersTitle')}
            </h2>
            <p className="mt-3 text-navy-200/70">{t('teachersText')}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="card-lift p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur hover:bg-white/10"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center text-xl">
                  {b.icon}
                </div>
                <h3 className="mt-4 font-bold text-white">{b.title}</h3>
                <p className="mt-2 text-sm text-navy-200/70 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CONTACT ---------------- */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div className="animate-fade-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              {t('contactTitle')}
            </h2>
            <p className="mt-3 text-slate-600">{t('contactText')}</p>

            <div className="mt-8 space-y-4">
              {[
                { icon: '📞', label: t('contactPhone'), value: '+998 90 123 45 67' },
                { icon: '📍', label: t('contactAddress'), value: 'Toshkent, King School' },
                { icon: '🕘', label: t('contactHours'), value: t('contactHoursValue') },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center text-lg flex-shrink-0">
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      {c.label}
                    </div>
                    <div className="font-semibold text-navy-900">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to={user ? SITE_PATHS.english : SITE_PATHS.signup}
              className="mt-8 inline-block px-7 py-3.5 rounded-xl bg-navy-800 text-white font-bold hover:bg-navy-900 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              {t('contactCta')}
            </Link>
          </div>

          <div className="animate-fade-right">
            <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 shadow-soft p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: '🎧', title: t('marquee3') },
                  { icon: '✍️', title: t('marquee4') },
                  { icon: '📗', title: t('marquee5') },
                  { icon: '🧬', title: t('marquee7') },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-navy-50 transition-colors"
                  >
                    <span className="text-xl">{b.icon}</span>
                    <span className="font-semibold text-navy-900 text-sm">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 px-6 sm:px-12 py-14 text-center">
          <div className="absolute inset-0 ks-grid-bg" aria-hidden />
          <div
            className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-navy-500/25 blur-3xl animate-float"
            aria-hidden
          />
          <div className="relative animate-fade-up">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-shimmer">
              {t('ctaTitle')}
            </h2>
            <p className="mt-3 text-navy-100/80">{t('ctaText')}</p>
            <button
              type="button"
              onClick={() => navigate(user ? typingPath() : SITE_PATHS.signup)}
              className="mt-8 px-8 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              {user ? t('navTypescript') : t('ctaButton')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
