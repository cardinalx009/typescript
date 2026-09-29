import { useCallback, useEffect, useRef, useState } from 'react';
import type { MockFileItem } from '../types';
import { uploadMockFile, deleteMockFile } from '../admin';

type Kind = 'listening' | 'reading';

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';

const fmtDate = (v: string) => {
  try {
    return new Date(v).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
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

export default function MocksManager({ onChanged }: { onChanged?: () => void }) {
  const [kind, setKind] = useState<Kind>('listening');
  const [mocks, setMocks] = useState<MockFileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (k: Kind) => {
    setLoading(true);
    setMocks(await fetchMocks(k));
    setLoading(false);
  }, []);

  useEffect(() => {
    load(kind);
  }, [kind, load]);

  const handleUpload = async () => {
    if (!file) return setErr('HTML fayl tanlang');
    setUploading(true);
    setErr('');
    setMsg('');
    const res = await uploadMockFile(kind, title, file);
    setUploading(false);
    if (!res.ok) return setErr(res.data?.error || 'Yuklashda xatolik');
    setMsg(`"${res.data?.mock?.title || title}" yuklandi`);
    setTitle('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    load(kind);
    onChanged?.();
  };

  const handleDelete = async (m: MockFileItem) => {
    if (!confirm(`"${m.title}" o'chirilsinmi?`)) return;
    setErr('');
    const res = await deleteMockFile(m.id);
    if (res.ok) {
      setMsg('Fayl o\'chirildi');
      load(kind);
      onChanged?.();
    } else {
      setErr(res.data?.error || 'O\'chirishda xatolik');
    }
  };

  return (
    <div className="space-y-5">
      {/* Kind tabs */}
      <div className="inline-flex bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 p-1.5">
        {(
          [
            { key: 'listening' as Kind, label: '🎧 Listening' },
            { key: 'reading' as Kind, label: '📖 Reading' },
          ]
        ).map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setKind(x.key)}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              kind === x.key
                ? 'bg-navy-800 text-white shadow'
                : 'text-slate-500 hover:text-navy-800'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Upload box */}
      <div className="rounded-2xl bg-white ring-1 ring-amber-200 shadow-sm p-5 sm:p-6">
        <div className="font-bold text-navy-900">
          📤 {kind === 'listening' ? 'Listening' : 'Reading'} uchun HTML fayl yuklash
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Faqat <b>.html</b> yoki <b>.htm</b> fayl. Fayl ochiq bo'limda shunchaki ko'rsatiladi.
        </p>

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

        {file && (
          <p className="mt-3 text-xs text-slate-500">
            Tanlangan: <b className="text-navy-800">{file.name}</b> ({fmtSize(file.size)})
          </p>
        )}
        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
        {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Mock nomi</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Fayl</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Hajmi</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Yuklangan</th>
                <th className="text-right px-4 py-3">Amal</th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {kind === 'listening' ? '🎧' : '📖'} {m.title}
                    </div>
                    <div className="text-[11px] text-slate-400 sm:hidden">{m.fileName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{m.fileName}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {fmtSize(m.size)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">
                    {fmtDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                    >
                      🗑️ O&apos;chirish
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Yuklanmoqda…
                  </td>
                </tr>
              )}
              {!loading && mocks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Hozircha fayl yuklanmagan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
