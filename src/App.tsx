import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  hasSeenTelegramModal,
  markTelegramModalSeen,
} from './storage';
import { TYPING_BASE, SITE_PATHS, ADMIN_PATH } from './sitePaths';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Transcribe from './components/Transcribe';
import Profile from './components/Profile';
import History from './components/History';
import Leaderboard from './components/Leaderboard';
import TelegramModal from './components/TelegramModal';
import SiteLayout from './site/SiteLayout';
import Home from './site/Home';
import SubjectPage from './site/SubjectPage';
import FullMock from './site/FullMock';
import MockViewer from './site/MockViewer';
import NotFound from './site/NotFound';
import AdminPanel from './site/AdminPanel';
import { isAdminSession, clearAdminToken, ADMIN_USER } from './admin';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [adminActive, setAdminActive] = useState(isAdminSession());
  const [loading, setLoading] = useState(true);
  const [showTgModal, setShowTgModal] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    const admin = isAdminSession();
    setAdminActive(admin);
    const saved = getCurrentUser();
    if (admin) setUser(ADMIN_USER);
    else if (saved) setUser(saved);
    setLoading(false);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (user && justLoggedIn) {
      if (user.isAdmin) {
        setJustLoggedIn(false);
      } else if (!hasSeenTelegramModal(user.id)) {
        timer = setTimeout(() => {
          setShowTgModal(true);
          setJustLoggedIn(false);
        }, 700);
      } else {
        setJustLoggedIn(false);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, justLoggedIn]);

  const handleLogout = () => {
    clearAdminToken();
    setAdminActive(false);
    setCurrentUser(null);
    setUser(null);
  };

  const handleAuth = (u: User, isNew: boolean) => {
    setAdminActive(isAdminSession());
    setUser(u);
    setJustLoggedIn(isNew);
  };

  const handleTgClose = () => {
    if (user) markTelegramModalSeen(user.id);
    setShowTgModal(false);
  };

  const handleTgJoined = () => {
    if (user) markTelegramModalSeen(user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-navy-800"></div>
      </div>
    );
  }

  const requireAuth = (el: React.ReactNode) =>
    user ? el : <Navigate to={SITE_PATHS.login} replace />;

  return (
    <>
      <Routes>
        {/* ---- Admin panel ---- */}
        <Route
          path={ADMIN_PATH}
          element={
            adminActive ? <AdminPanel onLogout={handleLogout} /> : <Navigate to={SITE_PATHS.login} replace />
          }
        />

        {/* ---- King School public / marketing site ---- */}
        <Route element={<SiteLayout user={user} onLogout={handleLogout} />}>
          <Route path="/" element={<Home user={user} />} />

          <Route
            path={SITE_PATHS.english}
            element={<SubjectPage subject="english" user={user} />}
          />
          <Route
            path={SITE_PATHS.native}
            element={<SubjectPage subject="native" user={user} />}
          />
          <Route
            path={SITE_PATHS.biology}
            element={<SubjectPage subject="biology" user={user} />}
          />
          <Route
            path={SITE_PATHS.chemistry}
            element={<SubjectPage subject="chemistry" user={user} />}
          />

          <Route
            path={SITE_PATHS.fullMock}
            element={requireAuth(<FullMock />)}
          />

          <Route
            path="/full-mock/view/:id"
            element={requireAuth(<MockViewer />)}
          />

          <Route
            path={SITE_PATHS.login}
            element={
              user ? (
                <Navigate to={SITE_PATHS.home} replace />
              ) : (
                <Login variant="site" onAuth={handleAuth} />
              )
            }
          />
          <Route
            path={SITE_PATHS.signup}
            element={
              user ? (
                <Navigate to={SITE_PATHS.home} replace />
              ) : (
                <Login
                  variant="site"
                  initialTab="register"
                  onAuth={handleAuth}
                />
              )
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---- Typescript app (authenticated) ---- */}
        <Route
          path={TYPING_BASE}
          element={requireAuth(<Dashboard user={user!} onLogout={handleLogout} />)}
        />
        <Route
          path={`${TYPING_BASE}/transcribe/:tempId`}
          element={requireAuth(<Transcribe user={user!} onLogout={handleLogout} />)}
        />
        <Route
          path={`${TYPING_BASE}/profile`}
          element={requireAuth(
            <Profile user={user!} onLogout={handleLogout} onUpdate={setUser} />
          )}
        />
        <Route
          path={`${TYPING_BASE}/history`}
          element={requireAuth(<History user={user!} onLogout={handleLogout} />)}
        />
        <Route
          path={`${TYPING_BASE}/leaderboard`}
          element={requireAuth(<Leaderboard user={user!} onLogout={handleLogout} />)}
        />
      </Routes>

      <TelegramModal
        open={showTgModal}
        onClose={handleTgClose}
        onJoined={handleTgJoined}
      />
    </>
  );
}

export default App;
