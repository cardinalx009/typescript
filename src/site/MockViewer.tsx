import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { mockViewPath, SITE_PATHS } from '../sitePaths';

export default function MockViewer() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      navigate(SITE_PATHS.fullMock, { replace: true });
      return;
    }

    let alive = true;
    setLoading(true);
    setError('');

    fetch(`/api/mocks/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok) {
          setTitle(data.mock.title);
          setHtml(data.mock.html);
          document.title = data.mock.title;
        } else {
          setError(data?.error || 'Mock topilmadi');
        }
      })
      .catch(() => alive && setError('Yuklab olishda xatolik'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-navy-900 text-white shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(SITE_PATHS.fullMock)}
            className="px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            ← King School
          </button>

          <div className="min-w-0 mr-auto">
            <div className="font-bold text-sm sm:text-base truncate">
              {loading ? 'Yuklanmoqda…' : title}
            </div>
          </div>

          <Link
            to={SITE_PATHS.fullMock}
            className="hidden sm:inline px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors whitespace-nowrap"
          >
            Boshqa mocklar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-0 sm:p-4">
        {loading ? (
          <div className="h-[70vh] flex items-center justify-center text-slate-500 bg-white">
            Yuklanmoqda…
          </div>
        ) : error ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-4 bg-white">
            <div className="text-5xl">😕</div>
            <div className="text-slate-600">{error}</div>
            <Link
              to={SITE_PATHS.fullMock}
              className="px-5 py-2.5 rounded-lg bg-navy-800 hover:bg-navy-900 text-white text-sm font-bold transition-colors"
            >
              ← King School'ga qaytish
            </Link>
          </div>
        ) : (
          <iframe
            title={title}
            srcDoc={html}
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
            className="w-full min-h-[calc(100vh-3.5rem)] bg-white border-0"
          />
        )}
      </main>
    </div>
  );
}
