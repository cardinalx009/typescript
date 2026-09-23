import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  hasSeenTelegramModal,
  markTelegramModalSeen,
} from './storage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Transcribe from './components/Transcribe';
import Profile from './components/Profile';
import History from './components/History';
import Leaderboard from './components/Leaderboard';
import TelegramModal from './components/TelegramModal';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTgModal, setShowTgModal] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    const saved = getCurrentUser();
    if (saved) setUser(saved);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && justLoggedIn && !hasSeenTelegramModal(user.id)) {
      const timer = setTimeout(() => {
        setShowTgModal(true);
        setJustLoggedIn(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user, justLoggedIn]);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  const handleAuth = (u: User, isNew: boolean) => {
    setUser(u);
    setJustLoggedIn(isNew || !hasSeenTelegramModal(u.id));
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Login onAuth={handleAuth} />
            )
          }
        />
        <Route
          path="/"
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/transcribe/:tempId"
          element={
            user ? (
              <Transcribe user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <Profile user={user} onLogout={handleLogout} onUpdate={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/history"
          element={
            user ? (
              <History user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leaderboard"
          element={
            user ? (
              <Leaderboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? '/' : '/login'} replace />}
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
