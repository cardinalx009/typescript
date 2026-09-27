import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, AudioRecord } from '../types';
import { getUserRecords, buildEditTempId } from '../storage';
import Layout from './Layout';

interface HistoryProps {
  user: User;
  onLogout: () => void;
}

export default function History({ user, onLogout }: HistoryProps) {
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await getUserRecords(user.id);
      if (!cancelled) {
        setRecords(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Muddati tugagan';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} kun qoldi`;
    }
    return `${hours} soat ${mins} daqiqa`;
  };

  const totalWords = records.reduce((sum, r) => sum + r.wordCount, 0);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>📚</span> Amaliyot tarixi
            </h2>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <span className="text-blue-600">🎧</span>
                <span className="font-semibold text-blue-700">
                  {records.length} ta audio
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                <span className="text-emerald-600">📝</span>
                <span className="font-semibold text-emerald-700">{totalWords} so'z</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Oxirgi 1 kun ichida saqlangan matnlaringiz. 1 kundan so'ng audio va matn
            avtomatik o'chadi, faqat statistika qoladi.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-r-4 border-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-700">
              Tarix yuklanmoqda...
            </h3>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Hali audio yuklamadingiz
            </h3>
            <p className="text-gray-500 mb-6">
              Audioni tinglab, matn yozishni bugun boshlang!
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold rounded-xl shadow-lg"
            >
              Audio yuklash →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const isOpen = selected === r.id;
              const timeLeft = getTimeLeft(r.expiresAt);
              const expired = new Date(r.expiresAt).getTime() < Date.now();
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all ${
                    isOpen ? 'ring-2 ring-blue-400' : 'hover:shadow-xl'
                  }`}
                >
                  <div
                    className="p-5 sm:p-6 cursor-pointer"
                    onClick={() => setSelected(isOpen ? null : r.id)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                            expired
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-gradient-to-br from-blue-500 to-sky-500 text-white'
                          }`}
                        >
                          {expired ? '📦' : '🎵'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-800 truncate">
                            {r.audioName}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 flex flex-wrap gap-2 sm:gap-4 mt-1">
                            <span>📅 {formatDateTime(r.createdAt)}</span>
                            <span className={expired ? 'text-red-500' : 'text-amber-600'}>
                              ⏳ {timeLeft}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="text-center">
                          <div className="text-lg sm:text-xl font-bold text-blue-700">
                            {r.wordCount}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">so'z</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="text-lg font-bold text-emerald-600">
                            {formatTime(r.progressSeconds)}
                          </div>
                          <div className="text-xs text-gray-500">o'rn</div>
                        </div>
                        <Link
                          to={`/transcribe/${buildEditTempId(r.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                            expired
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                              : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-md'
                          }`}
                        >
                          {expired ? 'Muddati o\'tgan' : 'Davom etish →'}
                        </Link>
                      </div>
                    </div>
                  </div>
                  {isOpen && !expired && r.transcript && (
                    <div className="border-t border-gray-100 p-5 sm:p-6 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2 font-medium">
                        📄 Matn (preview)
                      </div>
                      <div
                        className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed"
                        style={{
                          fontFamily:
                            "'Times New Roman', Georgia, 'Noto Serif', serif",
                          lineHeight: '1.8',
                        }}
                      >
                        {r.transcript.length > 600
                          ? r.transcript.slice(0, 600) + '…'
                          : r.transcript}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
