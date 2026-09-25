import { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { registerUser, loginUser, authWithGoogle, getUsers } from '../storage';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, config: any) => void;
          prompt: (callback?: any) => void;
        };
      };
    };
  }
}

interface LoginProps {
  onAuth: (user: User, isNew: boolean) => void;
}

type Tab = 'login' | 'register';

export default function Login({ onAuth }: LoginProps) {
  const [tab, setTab] = useState<Tab>('login');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  const resetErr = () => setError('');

  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (cancelled) return;
            const cred = response?.credential;
            if (!cred) return;
            setGoogleLoading(true);
            resetErr();
            try {
              const res = await authWithGoogle(cred);
              if (res.ok && res.user) {
                onAuth(res.user, !!res.isNew);
                return;
              }
              setError(res.error || 'Google orqali kirishda xatolik');
            } catch (e: any) {
              setError('Google orqali kirishda xatolik');
            } finally {
              setGoogleLoading(false);
            }
          },
          auto_select: false,
          ux_mode: 'popup',
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            width: googleBtnRef.current.clientWidth || 320,
            text: 'continue_with',
            logo_alignment: 'left',
          });
        }
      } catch (e) {
        // ignore GIS errors silently
      }
    };
    if (window.google?.accounts?.id) {
      init();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          init();
        }
      }, 150);
      const to = setTimeout(() => clearInterval(t), 10000);
      return () => {
        cancelled = true;
        clearInterval(t);
        clearTimeout(to);
      };
    }
    return () => { cancelled = true; };
  }, [googleClientId, onAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErr();

    if (!email.trim()) return setError('Emailni kiriting');
    if (!password) return setError('Parolni kiriting');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError('To\'g\'ri email kiriting');

    setLoading(true);
    try {
      if (tab === 'register') {
        if (!firstName.trim() || !lastName.trim()) {
          setLoading(false);
          return setError('Ism va familyani kiriting');
        }
        if (password.length < 4) {
          setLoading(false);
          return setError('Parol kamida 4 ta belgi bo\'lsin');
        }
        if (password !== confirmPassword) {
          setLoading(false);
          return setError('Parollar mos emas');
        }
        const res = await registerUser(firstName, lastName, email, password);
        if (!res.ok || !res.user) {
          setLoading(false);
          if (res.error && res.error.includes('Google')) {
            setTab('login');
          }
          if (res.error) return setError(res.error);
          return setError('Xatolik');
        }
        onAuth(res.user, true);
        return;
      }
      const res = await loginUser(email, password);
      if (!res.ok || !res.user) {
        setLoading(false);
        return setError(res.error || 'Xatolik');
      }
      onAuth(res.user, false);
    } catch (err) {
      setLoading(false);
      setError('Xatolik yuz berdi');
    }
  };

  const handleGooglePrompt = async () => {
    if (!googleClientId) {
      setError('Google Client ID sozlanmagan. Admin bilan bog\'laning.');
      return;
    }
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e: any) {
        setError('Google orqali kirish hozircha ishlamayapti');
      }
    } else {
      setError('Google yuklanmoqda, ozgina kuting');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 shadow-2xl overflow-hidden">
            <img
              src="/photo_2025-01-04_19-28-41.jpg"
              alt="King School Learning Center logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            KING SCHOOL LEARNING CENTER
          </h1>
          <h2 className="text-lg sm:text-xl font-semibold text-white/90 mb-1 sm:mb-2">
            English Listening Practice
          </h2>
          <p className="text-white/80 text-sm sm:text-base">
            🏫 O'quv markazining shaxsiy kabineti
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          {googleClientId && (
            <>
              <div className="mb-5 flex justify-center">
                <div
                  ref={googleBtnRef}
                  className={googleLoading ? 'opacity-60 pointer-events-none' : ''}
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </div>
              {googleLoading && (
                <div className="text-center text-sm text-blue-600 font-medium mb-4">
                  Google orqali kirish...
                </div>
              )}
              {!googleLoading && (
                <button
                  type="button"
                  onClick={handleGooglePrompt}
                  className="mb-5 w-full py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all hidden"
                >
                  Google orqali kirish
                </button>
              )}
              <div className="flex items-center gap-3 mb-5 text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs uppercase tracking-wider">yoki</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

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
              🔐 Kirish
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
              ✍️ Ro'yxatdan o'tish
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {tab === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Ism
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                      placeholder="Ism"
                      disabled={loading}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Familya
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                      placeholder="Familya"
                      disabled={loading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                placeholder="example@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-11 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                  placeholder={tab === 'register' ? 'Yangi parol' : 'Parolingiz'}
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
                <p className="mt-1 text-xs text-gray-500">Kamida 4 ta belgi</p>
              )}
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Parolni takrorlang
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                  placeholder="Parolni qayta kiriting"
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
                ? 'Kutilmoqda...'
                : tab === 'login'
                ? 'Hisobga kirish'
                : 'Ro\'yxatdan o\'tish'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://t.me/asadbekposts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              <span>✈️</span> Telegram kanalimiz
            </a>
            <div className="text-xs text-gray-400">
              King School Learning Center © 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
