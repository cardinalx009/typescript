import { useState, useEffect } from 'react';
import { User, AudioRecord } from '../types';
import { getUserRecords, saveUsers, getUsers, setCurrentUser, updateUserProfile } from '../storage';
import Layout from './Layout';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUpdate: (user: User) => void;
}

export default function Profile({ user, onLogout, onUpdate }: ProfileProps) {
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getUserRecords(user.id);
      if (cancelled) return;
      setRecords(r);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const totalAudios = records.length;
  const totalWords = records.reduce((sum, r) => sum + r.wordCount, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDeleteAccount = () => {
    if (!confirm('Hisobingizni o\'chirmoqchimisiz? Barcha ma\'lumotlar o\'chiriladi!')) {
      return;
    }
    const users = getUsers().filter(u => u.id !== user.id);
    saveUsers(users);
    onLogout();
  };

  const handleRefreshStats = async () => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      const recs = await getUserRecords(user.id);
      users[idx].totalWords = recs.reduce((s, r) => s + r.wordCount, 0);
      saveUsers(users);
      setCurrentUser(users[idx]);
      onUpdate(users[idx]);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setStatusMsg('Ism va familiya to\'ldirilishi kerak');
      setSaveStatus('error');
      return;
    }
    if (password && password !== confirmPassword) {
      setStatusMsg('Parollar mos emas');
      setSaveStatus('error');
      return;
    }
    if (password && password.length < 4) {
      setStatusMsg('Parol kamida 4 ta belgi bo\'lishi kerak');
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    setStatusMsg('');
    const patch: { firstName?: string; lastName?: string; password?: string } = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };
    if (password) patch.password = password;
    const res = await updateUserProfile(user.id, patch);
    if (!res.ok || !res.user) {
      setSaveStatus('error');
      setStatusMsg(res.error || 'Xatolik');
      return;
    }
    onUpdate(res.user);
    setSaveStatus('saved');
    setStatusMsg('Saqlandi');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => { setEditMode(false); setSaveStatus('idle'); setStatusMsg(''); }, 1500);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-white border-r-4 border-transparent mb-4"></div>
            <div className="text-white text-sm font-medium">Profil yuklanmoqda…</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-lg">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-500 mt-1">{user.email}</p>
            <p className="text-xs text-gray-400 mt-2">
              Qo'shilgan: {formatDate(user.joinedAt)}
            </p>

            <div className="mt-6 space-y-3">
              {!editMode ? (
                <button
                  onClick={() => {
                    setFirstName(user.firstName);
                    setLastName(user.lastName);
                    setPassword('');
                    setConfirmPassword('');
                    setStatusMsg('');
                    setSaveStatus('idle');
                    setEditMode(true);
                  }}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-all"
                >
                  ✏️ Ma\'lumotlarni tahrirlash
                </button>
              ) : (
                <>
                  <div className="text-left text-sm font-medium text-gray-700">Ism</div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <div className="text-left text-sm font-medium text-gray-700">Familya</div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <div className="text-left text-sm font-medium text-gray-700">Yangi parol (ixtiyoriy)</div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kamida 4 belgi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Parolni takrorlang"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {statusMsg && (
                    <div className={`text-xs px-3 py-2 rounded-lg ${
                      saveStatus === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : saveStatus === 'saved'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {statusMsg}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditMode(false); setSaveStatus('idle'); setStatusMsg(''); }}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saveStatus === 'saving'}
                      className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all"
                    >
                      {saveStatus === 'saving' ? 'Saqlanmoqda…' : 'Saqlash'}
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={handleRefreshStats}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-all"
              >
                🔄 Statistikani yangilash
              </button>
              <a
                href="https://t.me/asadbekposts"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium rounded-lg transition-all"
              >
                ✈️ Telegram kanalimiz
              </a>
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium rounded-lg transition-all"
              >
                🚪 Akauntdan chiqish
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-all"
              >
                🗑️ Hisobni o'chirish
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span>📈</span> Shaxsiy statistika
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-xl p-5 text-white">
                <div className="text-sm opacity-90">Jami so'zlar</div>
                <div className="text-3xl font-bold mt-1">{user.totalWords}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl p-5 text-white">
                <div className="text-sm opacity-90">Jami audiolar</div>
                <div className="text-3xl font-bold mt-1">{totalAudios}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-5 text-white">
                <div className="text-sm opacity-90">O'rtacha / audio</div>
                <div className="text-3xl font-bold mt-1">
                  {totalAudios > 0 ? Math.round(totalWords / totalAudios) : 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span>ℹ️</span> Qo'shimcha ma'lumotlar
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-sky-50 rounded-xl">
                <span className="text-2xl">⏰</span>
                <div>
                  <div className="font-semibold text-sky-900">Audio fayllar vaqtinchalik</div>
                  <div className="text-sm text-sky-800 mt-1">
                    Yuklangan audio va matnlaringiz 1 kundan so'ng avtomatik o'chib ketadi.
                    Faqat audio nomi va so'zlar soni statistikada qoladi.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-semibold text-green-900">Leaderboardda ishtirok</div>
                  <div className="text-sm text-green-800 mt-1">
                    Har saqlangan matningizdagi so'zlar soni umumiy hisobga olinadi va barcha foydalanuvchilar orasida reyting tuziladi.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-semibold text-blue-900">Mashq qilish maslahati</div>
                  <div className="text-sm text-blue-800 mt-1">
                    Audioni avval butunlay tinglang, keyin qismlarga bo'lib yozib chiqing.
                    Noto'g'ri yozilgan joylarni keyinroq audio bilan tekshiring.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src="/photo_2025-01-04_19-28-41.jpg"
                  alt="King School Learning Center logo"
                  className="w-14 h-14 rounded-xl object-cover bg-white shadow-lg"
                />
                <div>
                  <div className="text-xl font-bold">KING SCHOOL</div>
                  <div className="text-sm opacity-95">LEARNING CENTER</div>
                </div>
              </div>
              <a
                href="https://t.me/asadbekposts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-all shadow"
              >
                ✈️ Telegramga o'tish
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
