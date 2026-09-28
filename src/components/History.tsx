import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, AudioRecord } from '../types';
import { fetchUserRecords, deleteRecord, buildEditTempId } from '../storage';
import { typingPath } from '../sitePaths';
import Layout from './Layout';

interface HistoryProps {
  user: User;
  onLogout: () => void;
}

export default function History({ user, onLogout }: HistoryProps) {
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AudioRecord | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchUserRecords(user.id).then((list) => {
      if (!alive) return;
      setRecords(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const handleDelete = async (record: AudioRecord) => {
    await deleteRecord(record.id);
    setRecords(await fetchUserRecords(user.id));
    if (selected === record.id) setSelected(null);
    setConfirming(null);
  };

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
            Barcha yozgan matnlaringiz saqlanadi va har qanday qurilmadan kirib
            ko'ra olasiz.
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
              to={typingPath()}
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold rounded-xl shadow-lg"
            >
              Audio yuklash →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const isOpen = selected === r.id;
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all ${
                    isOpen ? 'ring-2 ring-blue-400' : 'hover:shadow-xl'
                  }`}
                >
                  <div
                    className="p-4 sm:p-6 cursor-pointer"
                    onClick={() => setSelected(isOpen ? null : r.id)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-sky-500 text-white">
                        🎵
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-800 truncate">
                          {r.audioName}
                        </div>
                        <div className="text-[11px] sm:text-sm text-gray-500 truncate mt-0.5">
                          📅 {formatDateTime(r.createdAt)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base sm:text-xl font-bold text-blue-700">
                          {r.wordCount}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500">so'z</div>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">
                          {formatTime(r.progressSeconds)}
                        </div>
                        <div className="text-xs text-gray-500">o'rn</div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Link
                          to={typingPath(`/transcribe/${buildEditTempId(r.id)}`)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-md"
                        >
                          Davom etirish →
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirming(r);
                          }}
                          className="px-4 py-2 rounded-lg font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all"
                        >
                          🗑 O'chirish
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:hidden">
                      <Link
                        to={typingPath(`/transcribe/${buildEditTempId(r.id)}`)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-center px-3 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md"
                      >
                        Davom etirish
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirming(r);
                        }}
                        className="w-11 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600 active:bg-red-100 transition-all"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  {isOpen && r.transcript && (
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

        {confirming && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirming(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">🗑</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                O'chirilsinmi?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                <span className="font-semibold">{confirming.audioName}</span> yozuvi
                butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirming)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 shadow-lg transition-all"
                >
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
