import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '../types';
import { savePendingAudio, getUserRecords, getLeaderboard } from '../storage';
import Layout from './Layout';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ audios: 0, words: 0, avg: 0, rank: 0, totalUsers: 0 });

  useEffect(() => {
    const records = getUserRecords(user.id);
    const words = records.reduce((s, r) => s + r.wordCount, 0);
    const users = getLeaderboard();
    const rank = users.findIndex((u) => u.id === user.id) + 1;
    setStats({
      audios: records.length,
      words: user.totalWords || words,
      avg: records.length ? Math.round(words / records.length) : 0,
      rank,
      totalUsers: users.length,
    });
  }, [user.id, user.totalWords]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Faqat audio fayl yuklang! (MP3, WAV, OGG, M4A va h.k.)');
      return;
    }
    const maxMB = 30;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`Audio fayl hajmi ${maxMB} MB dan oshmasligi kerak.`);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      try {
        const pending = savePendingAudio(file);
        navigate(`/transcribe/${pending.tempId}`, { replace: true });
      } catch (e) {
        setLoading(false);
        alert('Faylni yuklashda xatolik. Boshqattan urinib ko\'ring.');
      }
    }, 250);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="mb-5 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 rounded-2xl shadow-xl p-5 sm:p-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-white/80 mb-1">Salom, 👋</div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm sm:text-base text-white/85 mt-1">
                Bugun listening mashq qilishga tayyormisiz? 🚀
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 backdrop-blur px-4 py-2.5 rounded-xl text-center min-w-[88px]">
                <div className="text-xs text-white/85">#{stats.rank}/{stats.totalUsers}</div>
                <div className="text-lg font-bold">Reyting</div>
              </div>
              <Link
                to="/leaderboard"
                className="hidden sm:inline-flex items-center px-4 py-2.5 bg-white text-blue-700 font-semibold rounded-xl shadow-md hover:bg-blue-50 transition-all"
              >
                🏆 Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
          <div className="text-xs sm:text-sm text-gray-500">Jami so'zlar</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-blue-700">{stats.words}</div>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
          <div className="text-xs sm:text-sm text-gray-500">Audiodan</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-600">{stats.audios}</div>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
          <div className="text-xs sm:text-sm text-gray-500">O'rtacha</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-amber-600">{stats.avg}</div>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
          <div className="text-xs sm:text-sm text-gray-500">Reyting</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-purple-700">
            #{stats.rank}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          <div
            className={`bg-white rounded-2xl shadow-xl p-5 sm:p-10 border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/40'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onFileInput}
              disabled={loading}
            />

            <div className="text-center">
              {loading ? (
                <div className="py-8">
                  <div className="inline-block animate-spin rounded-full h-14 w-14 border-t-4 border-blue-500 border-r-4 border-transparent mb-4"></div>
                  <div className="text-lg font-semibold text-gray-700">
                    Audio tayyorlanmoqda...
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Bir zum kuting
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center mb-4 sm:mb-5">
                    <span className="text-4xl sm:text-5xl">📥</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                    Audio faylni yuklang
                  </h2>
                  <p className="text-gray-500 mb-1 text-sm sm:text-base">
                    Faylni shu yerga tashlang <span className="text-gray-400">yoki</span> bosing
                  </p>
                  <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-gray-500">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">.mp3</span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">.wav</span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">.ogg</span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">.m4a</span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">30 MB gacha</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg transition-all"
                  >
                    Faylni tanlash
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 sm:mt-6 bg-sky-50 border border-sky-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl flex-shrink-0">⏰</span>
            <div>
              <div className="font-semibold text-sky-900 text-sm sm:text-base">
                Eslatma! Audiolar vaqtinchalik saqlanadi
              </div>
              <div className="text-xs sm:text-sm text-sky-800 mt-1">
                Yuklangan audio va yozilgan matnlaringiz{' '}
                <strong>1 kundan so'ng avtomatik o'chib ketadi</strong>. Faqat{' '}
                <strong>audio nomi</strong> va <strong>yozilgan so'zlar soni</strong> umumiy
                statistikangizga qo'shilib, doimiy saqlanadi.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <Link
            to="/history"
            className="block bg-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">
                📚
              </div>
              <div>
                <div className="font-bold text-gray-800">Tarix</div>
                <div className="text-xs text-gray-500">Oxirgi mashqlar</div>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {stats.audios} ta
            </div>
            <div className="mt-2 text-sm text-blue-600 font-semibold">
              Ko'rish →
            </div>
          </Link>

          <Link
            to="/leaderboard"
            className="block bg-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
                🏆
              </div>
              <div>
                <div className="font-bold text-gray-800">Leaderboard</div>
                <div className="text-xs text-gray-500">Barcha o'quvchilar</div>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">
              #{stats.rank} / {stats.totalUsers}
            </div>
            <div className="mt-2 text-sm text-blue-600 font-semibold">
              Reytingni ko'rish →
            </div>
          </Link>

          <Link
            to="/profile"
            className="block bg-white rounded-2xl shadow-xl p-5 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <div className="font-bold text-gray-800">Profil</div>
                <div className="text-xs text-gray-500">Sozlamalar va chiqish</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-xs">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <span className="font-semibold text-gray-700 truncate">
                {user.firstName}
              </span>
            </div>
            <div className="mt-2 text-sm text-blue-600 font-semibold">
              Profilga o'tish →
            </div>
          </Link>

          <a
            href="https://t.me/asadbekposts"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl shadow-xl p-5 text-white hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                ✈️
              </div>
              <div>
                <div className="font-bold">Telegram kanal</div>
                <div className="text-xs text-white/85">Asadbek Posts rasmiy</div>
              </div>
            </div>
            <div className="text-sm bg-white/20 backdrop-blur px-3 py-2 rounded-lg text-center font-semibold">
              Azo bo'lish →
            </div>
          </a>
        </div>
      </div>
    </Layout>
  );
}
