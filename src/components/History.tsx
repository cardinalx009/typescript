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
      const recs = await getUserRecords(user.id);
      if (cancelled) return;
      setRecords(recs);
      setLoading(false);
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
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium">
                📝 {records.length} ta audio
              </div>
              <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-medium">
                ✍️ {totalWords} so'z
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Bu yerda so'nggi 24 soat ichida saqlangan amaliyotlaringiz ko'rsatiladi (audiolar vaqtinchalik 1 kun saqlanadi)
            {loading && <span className="ml-2 text-blue-500">Yuklanmoqda...</span>}
          </p>
        </div>

        {records.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div className="text-7xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Hali hech qanday amaliyot yo'q
            </h3>
            <p className="text-gray-500 mb-6">
              Asosiy saxifaga o'ting va birinchi audioni yuklab, mashq qilishni boshlang!
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-sky-600 transition-all shadow-lg"
            >
              Asosiy saxifaga o'tish
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {records.map((record, index) => (
              <div
                key={record.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all hover:shadow-2xl"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() =>
                    setSelected(selected === record.id ? null : record.id)
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                          <span>🎵</span> {record.audioName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDateTime(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                        {record.wordCount} so'z
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          getTimeLeft(record.expiresAt).includes('tugagan')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        ⏳ {getTimeLeft(record.expiresAt)}
                      </div>
                      <Link
                        to={`/transcribe/${buildEditTempId(record.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-lg text-sm font-semibold shadow transition-all"
                      >
                        <span>🔁</span> Davom etish
                      </Link>
                      <div
                        role="button"
                        aria-label="expand"
                        className="text-gray-400 text-xl select-none"
                      >
                        {selected === record.id ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>
                </div>

                {selected === record.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        Yozilgan matn:
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {record.progressSeconds > 0 && (
                          <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-lg font-medium">
                            ▶️ {formatTime(record.progressSeconds)} da qolgan
                          </span>
                        )}
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg font-medium">
                          📝 {record.transcript.length} belgi
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-200 max-h-80 overflow-y-auto">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                        {record.transcript || <span className="text-gray-400 italic">Hali matn yozilmagan…</span>}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        💡 <strong>Davom etish</strong> orqali tahrirlashingiz va audio qolgan joydan tinglashingiz mumkin (audio fayl hozirgi sessiyada bo'lsa).
                      </p>
                      <Link
                        to={`/transcribe/${buildEditTempId(record.id)}`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-bold shadow transition-all"
                      >
                        <span>🔁</span> O'zgartirish / Davom etish
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
