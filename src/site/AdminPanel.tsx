import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminStats, CourseRequestItem } from '../admin';
import {
  fetchAdminStats,
  fetchCourseRequests,
  setRequestStatus,
  deleteRequest,
} from '../admin';
import { SITE_PATHS } from '../sitePaths';
import UsersManager from './UsersManager';

type Tab = 'users' | 'requests';

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

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<CourseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    const res = await fetchAdminStats();
    if (res.ok && res.data?.stats) setStats(res.data.stats);
  };

  const loadRequests = async () => {
    const res = await fetchCourseRequests();
    if (res.ok && res.data?.requests) setRequests(res.data.requests);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadStats();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab === 'requests') loadRequests();
  }, [tab]);

  const handleLogout = () => {
    onLogout();
    navigate(SITE_PATHS.home);
  };

  const changeStatus = async (id: string, status: string) => {
    const res = await setRequestStatus(id, status);
    if (res.ok) loadRequests();
  };

  const removeRequest = async (id: string) => {
    if (!confirm("So'rov o'chirilsinmi?")) return;
    const res = await deleteRequest(id);
    if (res.ok) loadRequests();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-navy-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
          <img
            src="/photo_2025-01-04_19-28-41.jpg"
            alt="King School"
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30"
          />
          <div className="mr-auto">
            <div className="font-extrabold tracking-wide">ADMIN PANEL</div>
            <div className="text-[11px] text-navy-200">King School Learning Center</div>
          </div>
          <button
            type="button"
            onClick={() => navigate(SITE_PATHS.home)}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
          >
            🌐 Sayt
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-sm font-semibold transition-colors"
          >
            🚪 Chiqish
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Akkauntlar", value: stats?.users, icon: "👥", tone: "from-navy-800 to-navy-600" },
            { label: "Yozuvlar", value: stats?.records, icon: "🎧", tone: "from-sky-600 to-sky-400" },
            { label: "Jami so'z", value: stats?.totalWords, icon: "💬", tone: "from-emerald-500 to-teal-400" },
            { label: "So'rovlar", value: stats?.requests, icon: "📨", tone: "from-amber-500 to-orange-400" },
            { label: "Mocklar", value: stats?.mocks, icon: "📄", tone: "from-violet-600 to-purple-400" },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl bg-gradient-to-br ${s.tone} p-4 sm:p-5 text-white shadow-lg`}
            >
              <div className="text-xs opacity-90 flex items-center gap-1.5">
                <span>{s.icon}</span> {s.label}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                {loading ? "…" : (s.value ?? 0)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          {(
            [
              { key: "users" as Tab, label: "👥 Akkauntlar" },
              { key: "requests" as Tab, label: "📨 Kurs so'rovlari" },
            ]
          ).map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setTab(x.key)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                tab === x.key
                  ? "border-navy-800 text-navy-800"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {x.label}
              {x.key === "requests" && stats?.newRequests ? (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] text-white">
                  {stats.newRequests}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "users" ? (
          <UsersManager onChanged={loadStats} />
        ) : (
          <div className="space-y-3">
            {requests.length === 0 && (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 p-10 text-center text-slate-400">
                So'rovlar yo'q
              </div>
            )}
            {requests.map((r) => (
              <div key={r._id} className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="mr-auto min-w-0">
                    <div className="font-bold text-slate-800">{r.fullName}</div>
                    <div className="text-sm text-slate-500">
                      📞 {r.phone} · Yosh: {r.age || "-"}
                    </div>
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-navy-50 text-navy-700 text-[11px] font-bold uppercase">
                        {r.course}
                      </span>
                    </div>
                    {r.note && (
                      <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{r.note}</p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">{fmtDate(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r._id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-xs font-semibold outline-none"
                    >
                      <option value="new">Yangi</option>
                      <option value="contacted">Bog'landi</option>
                      <option value="done">Bajarildi</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRequest(r._id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
