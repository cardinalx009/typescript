import { User } from '../types';
import { getUserRecords, saveUsers, getUsers, setCurrentUser } from '../storage';
import Layout from './Layout';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUpdate: (user: User) => void;
}

export default function Profile({ user, onLogout, onUpdate }: ProfileProps) {
  const records = getUserRecords(user.id);
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

  const handleRefreshStats = () => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      const recs = getUserRecords(user.id);
      users[idx].totalWords = recs.reduce((s, r) => s + r.wordCount, 0);
      saveUsers(users);
      setCurrentUser(users[idx]);
      onUpdate(users[idx]);
    }
  };

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
