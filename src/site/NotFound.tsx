import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { SITE_PATHS } from '../sitePaths';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
      <div className="text-7xl font-extrabold text-navy-100">404</div>
      <h1 className="mt-4 text-3xl font-extrabold text-navy-900">{t('notFoundTitle')}</h1>
      <p className="mt-3 text-slate-600">{t('notFoundText')}</p>
      <Link
        to={SITE_PATHS.home}
        className="mt-8 inline-block px-7 py-3.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-bold transition-colors"
      >
        {t('notFoundBtn')}
      </Link>
    </div>
  );
}
