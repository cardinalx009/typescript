import { useCallback, useEffect, useState } from 'react';
import type { AdminUser, AdminUserRecord } from '../admin';
import {
  fetchAdminUsers,
  fetchAdminUserRecords,
  blockAdminUser,
  deleteAdminUser,
} from '../admin';

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

const initials = (u: AdminUser) =>
  `${(u.firstName || '?')[0]}${(u.lastName || '')[0] || ''}`.toUpperCase();

export default function UsersManager({ onChanged }: { onChanged?: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [openId, setOpenId] = useState<string | null>(null);
  const [openUser, setOpenUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [records, setRecords] = useState<AdminUserRecord[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [openRec, setOpenRec] = useState<string | null>(null);

  const loadUsers = useCallback(async (s: string) => {
    const res = await fetchAdminUsers(s);
    if (res.ok && res.data?.users) setUsers(res.data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers('');
  }, [loadUsers]);

  const toggleBlock = async (u: AdminUser) => {
    setError('');
    setMsg('');
    const res = await blockAdminUser(u.id, !u.isBlocked);
    if (!res.ok) return setError(res.data?.error || 'Xatolik');
    setMsg(u.isBlocked ? `${u.firstName} blokdan chiqarildi` : `${u.firstName} bloklandi`);
    loadUsers(search);
    onChanged?.();
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`"${u.firstName} ${u.lastName}" akkaunti butunlay o'chirilsinmi?`)) return;
    setError('');
    const res = await deleteAdminUser(u.id);
    if (!res.ok) return setError(res.data?.error || 'Xatolik');
    setMsg('Akkaunt o\'chirildi');
    setUsers((list) => list.filter((x) => x.id !== u.id));
    if (openId === u.id) setOpenId(null);
    onChanged?.();
  };

  const openHistory = async (u: AdminUser) => {
    setError('');
    setRecLoading(true);
    setOpenId(u.id);
    setOpenRec(null);
    setRecords([]);
    const res = await fetchAdminUserRecords(u.id);
    setRecLoading(false);
    if (!res.ok || !res.data) {
      setOpenId(null);
      return setError(res.data?.error || 'Xatolik');
    }
    setOpenUser(res.data.user);
    setRecords(res.data.records || []);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') loadUsers(search);
          }}
          placeholder="Ism yoki email orqali qidirish"
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg bg-white ring-1 ring-slate-200 outline-none focus:ring-4 focus:ring-navy-100 text-sm"
        />
        <button
          type="button"
          onClick={() => loadUsers(search)}
          className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold transition-colors"
        >
          🔍 Qidirish
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch('');
            loadUsers('');
          }}
          className="px-4 py-2 rounded-lg bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
        >
          Tozalash
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {msg && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {msg}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Foydalanuvchi</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3">So'z</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Yozuv</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Ro'yxatdan</th>
                <th className="text-right px-4 py-3">Amal</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(u)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-xs text-slate-400 sm:hidden truncate">
                          {u.email}
                        </div>
                        {u.isBlocked && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                            BLOKLANGAN
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell truncate max-w-[200px]">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{u.totalWords}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {u.recordCount}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">
                    {fmtDate(u.joinedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openHistory(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors"
                        title="Tarixini ko'rish"
                      >
                        📂 Tarix
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBlock(u)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          u.isBlocked
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                        }`}
                      >
                        {u.isBlocked ? '🔓 Ochish' : '🔒 Bloklash'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUser(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                      >
                        🗑️ O'chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Akkaunt topilmadi
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Yuklanmoqda…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
              <div className="mr-auto">
                <div className="font-bold text-slate-800">
                  {openUser ? `${openUser.firstName} ${openUser.lastName}` : 'Foydalanuvchi'}
                </div>
                <div className="text-xs text-slate-400">
                  {openUser?.email} · {records.length} ta yozuv
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {recLoading && (
                <div className="py-10 text-center text-slate-400">Yuklanmoqda…</div>
              )}
              {!recLoading && records.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  Bu foydalanuvchida yozuv yo'q
                </div>
              )}
              {records.map((r) => (
                <div key={r.id} className="rounded-xl ring-1 ring-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenRec(openRec === r.id ? null : r.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg">🎧</span>
                    <div className="mr-auto min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {r.audioName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {fmtDate(r.createdAt)} · {r.wordCount} so'z
                      </div>
                    </div>
                    <span className="text-xs text-navy-700 font-semibold">
                      {openRec === r.id ? 'Yopish' : "Ko'rish"}
                    </span>
                  </button>
                  {openRec === r.id && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                        {r.transcript || "Matn bo'sh"}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
