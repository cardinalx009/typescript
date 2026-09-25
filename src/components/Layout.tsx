import { User } from '../types';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  const location = useLocation();

  const navLinkClass = (path: string) =>
    `px-4 py-2 rounded-lg font-medium transition-all ${
      location.pathname === path
        ? 'bg-white text-blue-700 shadow-md'
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div className="min-h-screen">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/photo_2025-01-04_19-28-41.jpg"
                alt="King School Learning Center logo"
                className="w-10 h-10 rounded-full shadow-md object-cover bg-white"
              />
              <div className="hidden sm:block leading-tight">
                <div className="text-white font-bold text-lg">
                  KING SCHOOL LEARNING CENTER
                </div>
                <div className="text-white/70 text-xs">
                  English Listening
                </div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <Link to="/" className={navLinkClass('/')}>
                Asosiy
              </Link>
              <Link to="/history" className={navLinkClass('/history')}>
                Tarix
              </Link>
              <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
                Leaderboard
              </Link>
              <Link to="/profile" className={navLinkClass('/profile')}>
                Profil
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shadow">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <span className="text-white text-sm font-medium">
                  {user.firstName}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all"
              >
                Chiqish
              </button>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            <Link to="/" className={navLinkClass('/')}>
              Asosiy
            </Link>
            <Link to="/history" className={navLinkClass('/history')}>
              Tarix
            </Link>
            <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
              Leaderboard
            </Link>
            <Link to="/profile" className={navLinkClass('/profile')}>
              Profil
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
