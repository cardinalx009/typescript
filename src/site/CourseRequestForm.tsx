import { useState } from 'react';
import { useI18n } from '../i18n';
import { apiCall } from '../storage';
import { COURSES, CourseKey } from './subjects';

interface Props {
  defaultCourse: CourseKey;
  userId?: string;
}

export default function CourseRequestForm({ defaultCourse, userId }: Props) {
  const { t } = useI18n();
  const [course, setCourse] = useState<CourseKey>(defaultCourse);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) return setError(t('courseErrName'));
    if (!phone.trim()) return setError(t('courseErrPhone'));
    if (!course) return setError(t('courseErrCourse'));

    setSending(true);
    const resp = await apiCall('/api/course-requests', 'POST', {
      fullName: fullName.trim(),
      phone: phone.trim(),
      age: age.trim(),
      course,
      note: note.trim(),
      userId,
    });
    setSending(false);

    if (resp.ok) {
      setDone(true);
      setFullName('');
      setPhone('');
      setAge('');
      setNote('');
    } else {
      setError(resp.data?.error || t('courseErrGeneric'));
    }
  };

  const field =
    'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none transition-all focus:border-navy-400 focus:ring-4 focus:ring-navy-100';

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-emerald-800 font-semibold">{t('courseSuccess')}</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 text-sm font-semibold text-navy-700 hover:underline"
        >
          ↺
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white p-6 sm:p-8 ring-1 ring-slate-200/70 shadow-soft space-y-4"
    >
      <div>
        <h3 className="text-xl font-extrabold text-navy-900">{t('courseFormTitle')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('courseFormText')}</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {t('courseName')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={field}
            placeholder={t('courseName')}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {t('coursePhone')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={field}
            placeholder="+998 90 000 00 00"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {t('courseAge')}
          </label>
          <input
            type="number"
            min={5}
            max={80}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy-900 mb-1.5">
            {t('courseCourse')}
          </label>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value as CourseKey)}
            className={field}
          >
            {COURSES.map((c) => (
              <option key={c.key} value={c.key}>
                {t(c.nameKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-navy-900 mb-1.5">
          {t('courseNote')}
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={field}
          placeholder={t('courseNotePh')}
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full py-3.5 rounded-xl bg-navy-800 hover:bg-navy-900 disabled:opacity-60 text-white font-bold transition-colors shadow-soft"
      >
        {sending ? t('courseSending') : t('courseSubmit')}
      </button>
    </form>
  );
}
