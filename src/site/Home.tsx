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

  return (
    <div>
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 opacity-25">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/95 to-navy-800/90" />
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-navy-600/30 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-navy-100 text-sm font-medium border border-white/15">
              ✦ {t('heroBadge')}
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-navy-100/80 leading-relaxed">
              {t('heroText')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link
                    to={typingPath()}
                    className="px-7 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-colors shadow-soft"
                  >
                    ⌨ {t('navTypescript')}
                  </Link>
                  <Link
                    to={SITE_PATHS.fullMock}
                    className="px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    {t('navFullMock')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={SITE_PATHS.signup}
                    className="px-7 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-colors shadow-soft"
                  >
                    {t('heroCtaSignup')}
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    {t('heroCtaSubjects')}
                  </button>
                </>
              )}
            </div>

            <div className="mt-12 flex flex-wrap gap-8">
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

      <section id="subjects" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
            {t('subjectsTitle')}
          </h2>
          <p className="mt-3 text-slate-600">{t('subjectsText')}</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((s) => (
            <Link
              key={s.key}
              to={s.path}
              className={`group bg-white rounded-2xl overflow-hidden ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-soft ${s.ring}`}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={s.image}
                  alt={t(s.nameKey)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-white font-bold text-lg">{t(s.nameKey)}</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 leading-relaxed">{t(s.descKey)}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 group-hover:gap-3 transition-all">
                  {t('subjectOpen')} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              {t('featuresTitle')}
            </h2>
            <p className="mt-3 text-slate-600">{t('featuresText')}</p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-navy-200 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center text-xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-bold text-navy-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 px-6 sm:px-12 py-14 text-center relative overflow-hidden">
          <div
            className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-navy-500/25 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t('ctaTitle')}
            </h2>
            <p className="mt-3 text-navy-100/80">{t('ctaText')}</p>
            <button
              type="button"
              onClick={() => navigate(user ? typingPath() : SITE_PATHS.signup)}
              className="mt-8 px-8 py-3.5 rounded-xl bg-white text-navy-900 font-bold hover:bg-navy-50 transition-colors shadow-soft"
            >
              {user ? t('navTypescript') : t('ctaButton')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
