import { Link, Navigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { SITE_PATHS, typingPath } from '../sitePaths';
import { SUBJECTS, SubjectKey } from './subjects';
import CourseRequestForm from './CourseRequestForm';
import { User } from '../types';

interface Props {
  subject: SubjectKey;
  user: User | null;
}

export default function SubjectPage({ subject, user }: Props) {
  const { t } = useI18n();
  const meta = SUBJECTS.find((s) => s.key === subject);
  if (!meta) return <Navigate to={SITE_PATHS.home} replace />;

  const isEnglish = subject === 'english';

  return (
    <div>
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 opacity-30">
          <img src={meta.image} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-900/95 to-navy-900/70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <nav className="flex items-center gap-2 text-sm text-navy-200/70">
            <Link to={SITE_PATHS.home} className="hover:text-white transition-colors">
              {t('navHome')}
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">{t(meta.nameKey)}</span>
          </nav>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-4xl sm:text-5xl">{meta.icon}</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
              {t(meta.nameKey)}
            </h1>
          </div>
          <p className="mt-5 max-w-2xl text-navy-100/85 leading-relaxed">
            {t(meta.descKey)}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 ring-1 ring-slate-200/70 shadow-soft">
              <h2 className="text-2xl font-extrabold text-navy-900">
                {t('subjectsTitle')}
              </h2>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3">
                {meta.topicKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <span className="text-navy-600 font-bold">✓</span>
                    <span className="text-sm font-medium text-navy-900">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isEnglish && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 ring-1 ring-slate-200/70 shadow-soft">
                <h2 className="text-2xl font-extrabold text-navy-900">
                  {t('navSections')}
                </h2>
                <p className="mt-2 text-sm text-slate-500">{t('englishNote')}</p>

                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <Link
                    to={user ? typingPath() : SITE_PATHS.login}
                    className="group p-6 rounded-2xl bg-navy-900 text-white hover:bg-navy-800 transition-colors"
                  >
                    <div className="text-3xl">⌨</div>
                    <div className="mt-3 font-bold text-lg">{t('navTypescript')}</div>
                    <div className="mt-1 text-sm text-navy-200/80">
                      {t('englishGoTyping')}
                    </div>
                  </Link>
                  <Link
                    to={user ? SITE_PATHS.fullMock : SITE_PATHS.login}
                    className="group p-6 rounded-2xl border border-navy-200 text-navy-900 hover:bg-navy-50 transition-colors"
                  >
                    <div className="text-3xl">📝</div>
                    <div className="mt-3 font-bold text-lg">{t('navFullMock')}</div>
                    <div className="mt-1 text-sm text-slate-600">{t('englishGoMock')}</div>
                  </Link>
                </div>
              </div>
            )}

            {!isEnglish && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 ring-1 ring-slate-200/70">
                <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${meta.bar}`} />
                <h2 className="mt-5 text-2xl font-extrabold text-navy-900">
                  {t(meta.nameKey)}
                </h2>
                <p className="mt-3 text-slate-600 leading-relaxed">{t(meta.descKey)}</p>
                <img
                  src={meta.image}
                  alt={t(meta.nameKey)}
                  className="mt-6 w-full rounded-2xl object-cover"
                />
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="lg:sticky lg:top-28">
              <CourseRequestForm defaultCourse={meta.courseKey} userId={user?.id} />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
