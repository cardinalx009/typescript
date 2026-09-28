import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useI18n, Lang } from '../i18n';
import { SITE_PATHS, typingPath, ADMIN_PATH } from '../sitePaths';
import { SUBJECTS } from './subjects';
import { isAdminSession } from '../admin';

interface SiteLayoutProps {
  user: User | null;
  onLogout: () => void;
}

const LOGO = '/photo_2025-01-04_19-28-41.jpg';

export default function SiteLayout({ user, onLogout }: SiteLayoutProps) {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  const go = (path: string) => {
    setMenuOpen(false);
    setSubjectsOpen(false);
    if (path.startsWith('/#')) {
      navigate(path);
      setTimeout(() => {
        const el = document.querySelector(path.slice(1));
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    navigate(path);
  };

  const linkClass = (path: string) =>
    `px-2.5 xl:px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      location.pathname === path
        ? 'text-navy-800 bg-navy-50'
        : 'text-slate-600 hover:text-navy-800 hover:bg-navy-50/70'
    }`;

  const subjectPaths = SUBJECTS.map((s) => s.path);

  const mainLinks = [
    { label: t('navHome'), path: SITE_PATHS.home },
    { label: t('navContacts'), path: '/#contact' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-navy-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link
              to={SITE_PATHS.home}
              className={`flex items-center shrink-0 transition-all ${
                user ? 'gap-2' : 'gap-3'
              }`}
            >
              <img
                src={LOGO}
                alt="King School"
                className={`rounded-xl object-cover ring-2 ring-navy-100 transition-all ${
                  user ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-10 h-10 sm:w-12 sm:h-12'
                }`}
              />
              <div className="leading-tight">
                <div
                  className={`font-extrabold text-navy-900 tracking-wide whitespace-nowrap transition-all ${
                    user ? 'text-[13px] sm:text-sm' : 'text-base sm:text-lg'
                  }`}
                >
                  {t('brandName')}
                </div>
                <div
                  className={`text-navy-400 font-medium tracking-widest uppercase whitespace-nowrap transition-all ${
                    user ? 'text-[9px] sm:text-[10px]' : 'text-[11px] sm:text-xs'
                  }`}
                >
                  {t('brandSub')}
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {mainLinks.slice(0, 1).map((l) => (
                <button
                  key={l.path}
                  type="button"
                  onClick={() => go(l.path)}
                  className={linkClass(l.path)}
                >
                  {l.label}
                </button>
              ))}

              <div
                className="relative"
                onMouseEnter={() => setSubjectsOpen(true)}
                onMouseLeave={() => setSubjectsOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setSubjectsOpen((v) => !v)}
                  className={`px-2.5 xl:px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    subjectPaths.includes(location.pathname)
                      ? 'text-navy-800 bg-navy-50'
                      : 'text-slate-600 hover:text-navy-800 hover:bg-navy-50/70'
                  }`}
                >
                  {t('navSubjects')} ▾
                </button>

                {subjectsOpen && (
                  <div className="absolute left-0 top-full pt-1 w-60">
                    <div className="bg-white rounded-2xl shadow-soft ring-1 ring-slate-200/70 p-2">
                      {SUBJECTS.map((s) => (
                        <Link
                          key={s.key}
                          to={s.path}
                          onClick={() => setSubjectsOpen(false)}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            location.pathname === s.path
                              ? 'bg-navy-50'
                              : 'hover:bg-navy-50/70'
                          }`}
                        >
                          <span className="text-lg leading-none pt-0.5">{s.icon}</span>
                          <span className="leading-tight">
                            <span className="block text-sm font-semibold text-navy-900">
                              {t(s.nameKey)}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {t(s.descKey)}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {mainLinks.slice(1).map((l) => (
                <button
                  key={l.path}
                  type="button"
                  onClick={() => go(l.path)}
                  className={linkClass(l.path)}
                >
                  {l.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center rounded-xl bg-navy-50 p-1 text-xs font-semibold">
                {(['uz', 'en'] as Lang[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      lang === code
                        ? 'bg-white text-navy-800 shadow-sm'
                        : 'text-navy-400 hover:text-navy-700'
                    }`}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>

              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-1 pl-2 ml-1 border-l border-navy-100">
                    <span className="hidden 2xl:inline text-[11px] uppercase tracking-wider text-navy-400 font-semibold mr-1">
                      {t('navSections')}
                    </span>
                    <NavLink
                      to={typingPath()}
                      className={({ isActive }) =>
                        `px-2.5 xl:px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-navy-800 text-white'
                            : 'text-navy-700 hover:bg-navy-100'
                        }`
                      }
                    >
                      ⌨ {t('navTypescript')}
                    </NavLink>
                    <NavLink
                      to={SITE_PATHS.fullMock}
                      className={({ isActive }) =>
                        `px-2.5 xl:px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-navy-800 text-white'
                            : 'text-navy-700 hover:bg-navy-100'
                        }`
                      }
                    >
                      📝 {t('navFullMock')}
                    </NavLink>
                    {isAdminSession() && (
                      <NavLink
                        to={ADMIN_PATH}
                        className={({ isActive }) =>
                          `px-2.5 xl:px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                            isActive
                              ? 'bg-amber-400 text-navy-950'
                              : 'text-amber-700 hover:bg-amber-100'
                          }`
                        }
                      >
                        🛡️ Admin
                      </NavLink>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-navy-100">
                    <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                    <span className="hidden 2xl:block text-sm font-semibold text-navy-900 max-w-[120px] truncate">
                      {user.firstName}
                    </span>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-2.5 xl:px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {t('navLogout')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to={SITE_PATHS.login}
                    className="hidden sm:block px-4 py-2.5 rounded-xl text-sm font-semibold text-navy-800 border border-navy-200 hover:bg-navy-50 transition-colors"
                  >
                    {t('navLogin')}
                  </Link>
                  <Link
                    to={SITE_PATHS.signup}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 shadow-soft transition-colors"
                  >
                    {t('navSignup')}
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="lg:hidden p-2.5 rounded-xl text-navy-800 border border-navy-100"
                aria-label={t('navMenu')}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="lg:hidden pb-4 pt-2 space-y-1 border-t border-navy-100">
              {mainLinks.map((l) => (
                <button
                  key={l.path}
                  type="button"
                  onClick={() => go(l.path)}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-navy-50"
                >
                  {l.label}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-navy-100">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('navSubjects')}
                </div>
                {SUBJECTS.map((s) => (
                  <Link
                    key={s.key}
                    to={s.path}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-navy-50"
                  >
                    {s.icon} {t(s.nameKey)}
                  </Link>
                ))}
              </div>
              {user && (
                <div className="pt-2 mt-2 border-t border-navy-100 space-y-1">
                  <Link
                    to={typingPath()}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-navy-800 bg-navy-50"
                  >
                    ⌨ {t('navTypescript')}
                  </Link>
                  <Link
                    to={SITE_PATHS.fullMock}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-navy-800 bg-navy-50"
                  >
                    📝 {t('navFullMock')}
                  </Link>
                  {isAdminSession() && (
                    <Link
                      to={ADMIN_PATH}
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50"
                    >
                      🛡️ Admin
                    </Link>
                  )}
                </div>
              )}
              <div className="flex sm:hidden items-center rounded-xl bg-navy-50 p-1 text-xs font-semibold mt-3 w-fit">
                {(['uz', 'en'] as Lang[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`px-4 py-2 rounded-lg ${
                      lang === code ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400'
                    }`}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer id="contact" className="bg-navy-950 text-white/80 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={LOGO}
                alt="King School"
                className="w-11 h-11 rounded-xl object-cover"
              />
              <div className="leading-tight">
                <div className="font-extrabold text-white tracking-wide">
                  {t('brandName')}
                </div>
                <div className="text-xs uppercase tracking-widest text-white/50">
                  {t('brandSub')}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {t('footerAbout')}
            </p>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">{t('footerLinks')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to={SITE_PATHS.home} className="hover:text-white transition-colors">
                  {t('navHome')}
                </Link>
              </li>
              <li>
                <Link to={SITE_PATHS.english} className="hover:text-white transition-colors">
                  {t('subjectEnglish')}
                </Link>
              </li>
              <li>
                <Link to={SITE_PATHS.native} className="hover:text-white transition-colors">
                  {t('subjectNative')}
                </Link>
              </li>
              <li>
                <Link to={SITE_PATHS.biology} className="hover:text-white transition-colors">
                  {t('subjectBiology')}
                </Link>
              </li>
              <li>
                <Link to={SITE_PATHS.chemistry} className="hover:text-white transition-colors">
                  {t('subjectChemistry')}
                </Link>
              </li>
              {user && (
                <li>
                  <Link to={typingPath()} className="hover:text-white transition-colors">
                    {t('navTypescript')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">{t('footerContacts')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li>Telegram: @asadbekposts</li>
              <li>Toshkent, O'zbekiston</li>
              <li>
                <a
                  href="https://t.me/asadbekposts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  ✈ {t('footerTelegram')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
            <span>© {new Date().getFullYear()} King School. {t('footerRights')}</span>
            <span>{t('footerDev')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
