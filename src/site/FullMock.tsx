import { useI18n, TKey } from '../i18n';

const PLANNED: { icon: string; title: string; textKey: TKey }[] = [
  { icon: '🎧', title: 'Listening', textKey: 'mockListeningText' },
  { icon: '📖', title: 'Reading', textKey: 'mockReadingText' },
  { icon: '✍️', title: 'Use of English', textKey: 'mockUseOfEnglishText' },
  { icon: '📊', title: 'Result', textKey: 'mockResultText' },
];

export default function FullMock() {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-50 text-navy-700 text-sm font-semibold">
          ⏳ {t('fullMockSoon')}
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold text-navy-900">
          {t('fullMockTitle')}
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t('fullMockText')}
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANNED.map((p) => (
          <div
            key={p.title}
            className="p-6 rounded-2xl bg-white ring-1 ring-slate-200/70 opacity-70"
          >
            <div className="text-3xl">{p.icon}</div>
            <h3 className="mt-3 font-bold text-navy-900">{p.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{t(p.textKey)}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-slate-400">{t('fullMockNote')}</p>
    </div>
  );
}
