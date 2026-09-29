import { useCallback, useEffect, useRef, useState } from 'react';
import type { MockFileItem } from '../types';
import { isAdminSession, uploadMockFile, deleteMockFile } from '../admin';
import { useI18n } from '../i18n';
import { mockViewPath } from '../sitePaths';

type Kind = 'listening' | 'reading';

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';

const fmtDate = (v: string) => {
  try {
    return new Date(v).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const fetchMocks = async (kind: Kind): Promise<MockFileItem[]> => {
  try {
    const res = await fetch(`/api/mocks?kind=${kind}`);
    const data = await res.json();
    return data?.ok && Array.isArray(data.mocks) ? data.mocks : [];
  } catch {
    return [];
  }
};

export default function FullMock() {
  const { t } = useI18n();
  const isAdmin = isAdminSession();

  const [kind, setKind] = useState<Kind>('listening');
  const [mocks, setMocks] = useState<MockFileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upMsg, setUpMsg] = useState('');
  const [upErr, setUpErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (k: Kind) => {
    setLoading(true);
    setMocks(await fetchMocks(k));
    setLoading(false);
  }, []);

  useEffect(() => {
    load(kind);
  }, [kind, load]);

  const openMock = (m: MockFileItem) => {
    window.open(mockViewPath(m.id), '_blank', 'noopener,noreferrer');
  };

  const handleUpload = async () => {
    if (!file) return setUpErr('HTML fayl tanlang');
    setUploading(true);
    setUpErr('');
    setUpMsg('');
    const res = await uploadMockFile(kind, title, file);
    setUploading(false);
    if (!res.ok) return setUpErr(res.data?.error || 'Yuklashda xatolik');
    setUpMsg(t('mockUploaded'));
    setTitle('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    load(kind);
  };

  const handleDelete = async (m: MockFileItem) => {
    if (!confirm(`"${m.title}" o'chirilsinmi?`)) return;
    const res = await deleteMockFile(m.id);
    if (res.ok) load(kind);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-navy-900">
          {t('fullMockTitle')}
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t('fullMockText')}
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-10 flex justify-center">
        <div className="inline-flex bg-white rounded-2xl shadow-lg ring-1 ring-slate-200/80 p-1.5">
          {(
            [
              { key: 'listening' as Kind, label: '🎧 ' + t('mockListening') },
              { key: 'reading' as Kind, label: '📖 ' + t('mockReading') },
            ]
          ).map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setKind(x.key)}
              className={`px-6 sm:px-8 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all ${
                kind === x.key
                  ? 'bg-navy-800 text-white shadow-md'
                  : 'text-slate-500 hover:text-navy-800'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin upload */}
      {isAdmin && (
        <div className="mt-8 rounded-2xl bg-white ring-1 ring-amber-200 shadow-sm p-5 sm:p-6">
          <div className="font-bold text-navy-900 flex items-center gap-2">
            📤 HTML yuklash — {kind === 'listening' ? t('mockListening') : t('mockReading')}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mock nomi (ixtiyoriy)"
              className="px-4 py-2.5 rounded-lg bg-slate-50 ring-1 ring-slate-200 outline-none focus:ring-4 focus:ring-navy-100 text-sm"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="px-4 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-navy-800 file:text-white file:text-xs file:font-semibold cursor-pointer"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-900 text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {uploading ? 'Yuklanmoqda…' : '📁 Yuklash'}
            </button>
          </div>
          {upErr && <p className="mt-3 text-sm text-rose-600">{upErr}</p>}
          {upMsg && <p className="mt-3 text-sm text-emerald-600">{upMsg}</p>}
        </div>
      )}

      {/* List */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white ring-1 ring-slate-200/80 animate-pulse"
            />
          ))}

        {!loading && mocks.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white ring-1 ring-slate-200/80 py-14 text-center text-slate-400">
            {t('mockNoFiles')}
          </div>
        )}

        {mocks.map((m) => (
          <div
            key={m.id}
            className="group rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <button
              type="button"
              onClick={() => openMock(m)}
              className="w-full text-left p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-2xl">{kind === 'listening' ? '🎧' : '📖'}</div>
                <span className="text-[11px] font-bold text-navy-700 bg-navy-50 px-2 py-1 rounded-lg whitespace-nowrap">
                  Oynada ochish ↗
                </span>
              </div>
              <div className="mt-2 font-bold text-navy-900 line-clamp-2">{m.title}</div>
              <div className="mt-1 text-xs text-slate-400">
                {m.fileName} · {fmtSize(m.size)} · {fmtDate(m.createdAt)}
              </div>
            </button>
            {isAdmin && (
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                >
                  🗑️ O&apos;chirish
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
