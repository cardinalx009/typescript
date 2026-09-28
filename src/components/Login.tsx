import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { registerUser, loginUser, googleLogin, getUsers } from '../storage';
import { useI18n } from '../i18n';
import { SITE_PATHS } from '../sitePaths';
import GoogleSignInButton from './GoogleSignInButton';

interface LoginProps {
  onAuth: (user: User, isNew: boolean) => void;
  variant?: 'app' | 'site';
  initialTab?: 'login' | 'register';
}

type Tab = 'login' | 'register';

export default function Login({ onAuth, variant = 'app', initialTab = 'login' }: LoginProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isSite = variant === 'site';

  const [tab, setTab] = useState<Tab>(initialTab);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetErr = () => setError('');

  const handleGoogle = async (credential: string) => {
    resetErr();
    setLoading(true);
    const res = await googleLogin(credential);
    setLoading(false);
    if (res.ok && res.user) onAuth(res.user, false);
    else setError(res.error || t('formErrGeneric'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErr();

    if (!email.trim()) return setError(t('formErrEmail'));
    if (!password) return setError(t('formErrPassword'));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError(t('formErrEmail'));

    setLoading(true);
    try {
      if (tab === 'register') {
        if (!firstName.trim() || !lastName.trim()) {
          setLoading(false);
          return setError(t('formErrName'));
        }
        if (password.length < 4) {
          setLoading(false);
          return setError(t('formErrShort'));
        }
        if (password !== confirmPassword) {
          setLoading(false);
          return setError(t('formErrMatch'));
        }
        const existedEmail = getUsers().some(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        if (existedEmail) {
          setTab('login');
          setLoading(false);
          return setError(t('formErrExists'));
        }
        const res = await registerUser(firstName, lastName, email, password);
        if (!res.ok || !res.user) {
          setLoading(false);
          return setError(res.error || t('formErrGeneric'));
        }
        setLoading(false);
        onAuth(res.user, true);
      } else {
        const res = await loginUser(email, password);
        if (!res.ok || !res.user) {
          setLoading(false);
          return setError(res.error || t('formErrGeneric'));
        }
        setLoading(false);
        onAuth(res.user, false);
      }
    } catch {
      setLoading(false);
      setError(t('formErrGeneric'));
    }
  };

  const inputClass =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg outline-none transition-all text-sm sm:text-base disabled:opacity-60';
  const inputTone = isSite
    ? 'border-slate-200 bg-white text-navy-900 focus:ring-4 focus:ring-navy-100 focus:border-navy-400'
    : 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelTone = isSite ? 'text-navy-800' : 'text-gray-700';

  return (
    <div
      className={
        isSite
          ? 'min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6'
          : 'app-bg min-h-screen flex items-center justify-center p-3 sm:p-6'
      }
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 shadow-2xl overflow-hidden">
            <img
              src="/photo_2025-01-04_19-28-41.jpg"
              alt="King School Learning Center logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-bold mb-1 ${
              isSite ? 'text-navy-900' : 'text-white'
            }`}
          >
            KING SCHOOL LEARNING CENTER
          </h1>
          <h2
            className={`text-lg sm:text-xl font-semibold mb-1 sm:mb-2 ${
              isSite ? 'text-navy-600' : 'text-white/90'
            }`}
          >
            {isSite
              ? tab === 'login'
                ? t('authLoginTitle')
                : t('authRegisterTitle')
              : 'English Listening Practice'}
          </h2>
          {isSite && (
            <button
              type="button"
              onClick={() => navigate(SITE_PATHS.home)}
              className="text-sm text-navy-500 hover:text-navy-800 transition-colors"
            >
              ← {t('authBackHome')}
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5 sm:mb-6">
            <button
              type="button"
              onClick={() => { setTab('login'); resetErr(); }}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                tab === 'login'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔐 {t('authLoginBtn')}
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); resetErr(); }}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                tab === 'register'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✍️ {t('authRegisterBtn')}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <GoogleSignInButton
            onCredential={handleGoogle}
            text="continue_with"
            fallbackLabel={t('authGoogleOff')}
          />

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            {t('authOr')}
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelTone}`}>
                    {t('authFirstName')}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`${inputClass} ${inputTone}`}
                    placeholder={t('authFirstName')}
                    disabled={loading}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelTone}`}>
                    {t('authLastName')}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`${inputClass} ${inputTone}`}
                    placeholder={t('authLastName')}
                    disabled={loading}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${labelTone}`}>
                {t('authEmail')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass} ${inputTone}`}
                placeholder="example@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${labelTone}`}>
                {t('authPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} ${inputTone} pr-11 sm:pr-12`}
                  placeholder={tab === 'register' ? t('authRegisterTitle') : t('authLoginTitle')}
                  disabled={loading}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 sm:right-3 flex items-center text-gray-400 hover:text-gray-600 px-2 text-sm sm:text-base"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {tab === 'register' && (
                <p className="mt-1 text-xs text-gray-500">4+</p>
              )}
            </div>

            {tab === 'register' && (
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${labelTone}`}>
                  {t('authConfirm')}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} ${inputTone}`}
                  placeholder={t('authConfirm')}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
            >
              {loading
                ? t('authLoading')
                : tab === 'login'
                ? t('authLoginBtn')
                : t('authRegisterBtn')}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://t.me/asadbekposts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              <span>✈️</span> {t('footerTelegram')}
            </a>
            {isSite ? (
              <button
                type="button"
                onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); resetErr(); }}
                className="text-xs text-navy-600 hover:text-navy-900 font-semibold"
              >
                {tab === 'login' ? t('authNoAccount') : t('authHasAccount')}
              </button>
            ) : (
              <div className="text-xs text-gray-400">
                King School Learning Center © 2026
              </div>
            )}
          </div>
        </div>

        {isSite && (
          <div className="mt-4 text-center">
            <Link
              to={SITE_PATHS.home}
              className="text-sm text-navy-500 hover:text-navy-800 transition-colors"
            >
              ← {t('authBackHome')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
