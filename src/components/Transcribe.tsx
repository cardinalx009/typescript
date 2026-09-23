import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, AudioRecord } from '../types';
import {
  getPendingAudio,
  getRecord,
  addRecord,
  updateRecord,
  clearPendingAudio,
  getUserRecords,
  linkTempIdToRecord,
  buildEditTempId,
  PendingAudioData,
} from '../storage';

interface TranscribeProps {
  user: User;
  onLogout: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function Transcribe({ user, onLogout }: TranscribeProps) {
  const { tempId } = useParams<{ tempId: string }>();
  const navigate = useNavigate();

  const initial = useMemo(() => {
    if (!tempId) return null;

    if (tempId.startsWith(buildEditTempId('').slice(0, 4))) {
      const recordId = tempId.slice(4);
      const rec = getRecord(recordId);
      if (!rec || rec.userId !== user.id) return null;
      return {
        mode: 'edit' as const,
        recordId: rec.id,
        audioName: rec.audioName,
        transcript: rec.transcript,
        progressSeconds: rec.progressSeconds,
        pending: null as PendingAudioData | null,
      };
    }

    const pending = getPendingAudio(tempId);
    if (!pending) return null;
    let linkedRecord: AudioRecord | null = null;
    if (pending.recordId) linkedRecord = getRecord(pending.recordId);
    if (linkedRecord && linkedRecord.userId !== user.id) linkedRecord = null;
    return {
      mode: (linkedRecord ? 'edit' : 'new') as 'new' | 'edit',
      recordId: linkedRecord?.id || null as string | null,
      audioName: linkedRecord?.audioName || pending.name.replace(/\.[^/.]+$/, ''),
      transcript: linkedRecord?.transcript || '',
      progressSeconds: linkedRecord?.progressSeconds || 0,
      pending,
    };
  }, [tempId, user.id]);

  const baseAudioSrc = initial?.pending?.url || undefined;
  const [overrideAudioSrc, setOverrideAudioSrc] = useState<string | undefined>(undefined);
  const [audioName, setAudioName] = useState(initial?.audioName || '');
  const [transcript, setTranscript] = useState(initial?.transcript || '');
  const [recordId, setRecordId] = useState<string | null>(initial?.recordId || null);
  const [stepOne, setStepOne] = useState<boolean>(!!initial?.recordId || false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [shortcutsEnabled] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const [resumed, setResumed] = useState(false);
  const [audioReUploadName, setAudioReUploadName] = useState<string>('');

  const audioSrc = overrideAudioSrc || baseAudioSrc;
  const isEditWithoutAudio = !!initial && initial.mode === 'edit' && !baseAudioSrc;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastShiftFireRef = useRef(0);
  const lastProgressSaveRef = useRef(0);
  const transcriptDebounceRef = useRef<number | null>(null);
  const audioNameDebounceRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);

  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return true;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return !hasTouch;
  }, []);

  useEffect(() => {
    if (!initial) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 250);
      return () => clearTimeout(timer);
    }
  }, [initial, navigate]);

  useEffect(() => {
    if (!isDesktop) return;
    if (!shortcutsEnabled) return;
    if (!stepOne) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && e.location === 1) {
        const now = Date.now();
        if (now - lastShiftFireRef.current < 150) return;
        lastShiftFireRef.current = now;
        e.preventDefault();
        togglePlay();
      }
      if (e.ctrlKey && (e.key === 'Enter' || e.key === 'NumpadEnter')) {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (stepOne && textareaRef.current && !transcript.length) {
      textareaRef.current.focus();
    }
  }, [stepOne, transcript.length]);

  useEffect(() => {
    if (stepOne && audioRef.current && audioSrc && !resumed) {
      const seconds = initial?.progressSeconds || 0;
      if (seconds > 0) {
        audioRef.current.currentTime = seconds;
        setCurrentTime(seconds);
      }
      setResumed(true);
    }
  }, [stepOne, audioSrc, initial?.progressSeconds, resumed]);

  useEffect(() => {
    return () => {
      if (transcriptDebounceRef.current) window.clearTimeout(transcriptDebounceRef.current);
      if (audioNameDebounceRef.current) window.clearTimeout(audioNameDebounceRef.current);
      if (initial?.pending && tempId) clearPendingAudio(tempId);
      if (overrideAudioSrc) {
        try { URL.revokeObjectURL(overrideAudioSrc); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideAudioSrc]);

  const handleReUploadAudio = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      alert('Iltimos audio fayl tanlang (mp3, wav, m4a va h.k.)');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('Audio fayl 30 MB dan kichik bo\'lishi kerak');
      return;
    }
    if (overrideAudioSrc) {
      try { URL.revokeObjectURL(overrideAudioSrc); } catch {}
    }
    const url = URL.createObjectURL(file);
    setAudioReUploadName(file.name);
    setOverrideAudioSrc(url);
    setResumed(false);
  };

  if (!initial) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-3">⌛</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Audio topilmadi</h2>
          <p className="text-gray-500 mb-5 text-sm">
            Audio muddati tugagan yoki noto'g'ri havola. Iltimos qaytadan yuklang.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-lg font-semibold shadow-md"
          >
            Asosiyga qaytish
          </Link>
        </div>
      </div>
    );
  }

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!audioSrc) return;
    if (audioRef.current.paused) {
      try {
        const p = audioRef.current.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    } else {
      audioRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      currentTimeRef.current = t;
      const now = Date.now();
      if (now - lastProgressSaveRef.current > 3500) {
        lastProgressSaveRef.current = now;
        ensureSaved(t);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      lastProgressSaveRef.current = Date.now();
      scheduleSave({ progressSeconds: time });
    }
  };

  const skipBack = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - sec);
      lastProgressSaveRef.current = Date.now();
    }
  };
  const skipFwd = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration || 0,
        audioRef.current.currentTime + sec
      );
      lastProgressSaveRef.current = Date.now();
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const sizeMB = initial.pending ? (initial.pending.size / 1024 / 1024).toFixed(2) : '—';
  const recentCount = getUserRecords(user.id).length;
  const initialProgress = initial.progressSeconds || 0;

  const ensureSaved = (progressSecondsOverride?: number) => {
    const progress =
      progressSecondsOverride !== undefined ? progressSecondsOverride : currentTimeRef.current;
    scheduleSave({ progressSeconds: progress });
  };

  const scheduleSave = (patch: { transcript?: string; audioName?: string; progressSeconds?: number }) => {
    if (!stepOne) return;
    if (!audioName.trim()) return;

    const transcriptToSave = patch.transcript ?? transcript;
    const nameToSave = (patch.audioName ?? audioName).trim();
    const progressToSave = patch.progressSeconds ?? currentTimeRef.current;

    if (!recordId) {
      if (!nameToSave || (!transcriptToSave && progressToSave < 1)) return;
      const rec = addRecord(user.id, nameToSave, transcriptToSave, progressToSave);
      setRecordId(rec.id);
      if (tempId && initial.pending) linkTempIdToRecord(tempId, rec.id);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
      return;
    }

    setSaveStatus('saving');
    try {
      updateRecord(recordId, {
        transcript: transcriptToSave,
        audioName: nameToSave,
        progressSeconds: progressToSave,
      });
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch {
      setSaveStatus('error');
    }
  };

  const onTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setTranscript(next);
    if (transcriptDebounceRef.current) window.clearTimeout(transcriptDebounceRef.current);
    transcriptDebounceRef.current = window.setTimeout(() => {
      scheduleSave({ transcript: next, progressSeconds: currentTimeRef.current });
    }, 450);
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setAudioName(next);
    if (audioNameDebounceRef.current) window.clearTimeout(audioNameDebounceRef.current);
    audioNameDebounceRef.current = window.setTimeout(() => {
      scheduleSave({ audioName: next, progressSeconds: currentTimeRef.current });
    }, 400);
  };

  const goToWrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioName.trim()) return;
    if (initialProgress > 0 || transcript.length > 0) {
      scheduleSave({ progressSeconds: initialProgress, transcript });
    }
    setStepOne(true);
  };

  const handleSaveNow = () => {
    if (!audioName.trim()) {
      alert('Audio nomini kiriting!');
      return;
    }
    lastProgressSaveRef.current = Date.now();
    scheduleSave({ progressSeconds: currentTimeRef.current, transcript, audioName });
  };

  const handleSaveAndExit = () => {
    if (audioName.trim()) {
      lastProgressSaveRef.current = Date.now();
      try {
        if (!recordId) {
          addRecord(user.id, audioName, transcript, currentTimeRef.current);
        } else {
          updateRecord(recordId, {
            transcript,
            audioName,
            progressSeconds: currentTimeRef.current,
          });
        }
      } catch {}
    }
    if (initial.pending && tempId) clearPendingAudio(tempId);
    navigate('/history', { replace: true });
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!audioName.trim()) return;
    try {
      if (!recordId) {
        addRecord(user.id, audioName, transcript, currentTimeRef.current);
      } else {
        updateRecord(recordId, {
          transcript,
          audioName,
          progressSeconds: currentTimeRef.current,
        });
      }
    } catch {}
    e.preventDefault();
  };

  useEffect(() => {
    if (stepOne) window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepOne, recordId, audioName, transcript]);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img
                src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Minimalist%20premium%20academy%20shield%20logo%2C%20bold%20stylized%20black%20lion%20head%20inside%20outlined%20classic%20shield%20crest%20badge%2C%20clean%20vector%20emblem%2C%20white%20and%20navy%20blue%20colors%2C%20no%20text%2C%20high%20quality%20logo%20icon%20for%20Asadbek%20Posts%20language%20learning%20center%20brand&image_size=square_hd"
                alt="Asadbek Posts logo"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow object-cover bg-white flex-shrink-0"
              />
              <div className="hidden sm:block leading-tight">
                <div className="text-white font-bold">ASADBEK POSTS</div>
                <div className="text-white/70 text-xs">Listening Practice</div>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="hidden xs:flex sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white font-bold text-xs shadow">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <span className="text-white text-sm font-medium hidden md:block truncate max-w-[120px]">
                  {user.firstName}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-2.5 sm:px-3 py-1.5 bg-red-500/85 hover:bg-red-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      </nav>

      {!stepOne && (
        <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-5 sm:px-8 py-5 sm:py-6 text-white">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/25 rounded-xl flex items-center justify-center text-2xl sm:text-3xl backdrop-blur">
                  🎵
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-base sm:text-lg truncate">
                    {initial.pending?.name || audioName}
                  </div>
                  <div className="text-white/90 text-xs sm:text-sm">
                    {initial.pending ? `${sizeMB} MB • ` : ''}1-kundan keyin o'chiriladi
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={goToWrite} className="p-5 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                Audioni nomlang
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Bu nom statistikangiz va tarixda saqlanadi. Nom va matnlaringiz avtomatik saqlanadi.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio nomi
              </label>
              <input
                type="text"
                value={audioName}
                onChange={(e) => setAudioName(e.target.value)}
                autoFocus
                placeholder="Masalan: BBC News Lesson 12"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-base"
              />
              <div className="mt-2 text-xs text-gray-400 flex justify-between flex-wrap gap-1">
                <span>✔️ Saqlanadi: Nomi + so'zlar soni + audio o'rni (avtomatik)</span>
                <span>⏳ 1 kundan so'ng matn+audio o'chadi</span>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/"
                  className="order-2 sm:order-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-center transition-all text-sm"
                >
                  ← Ortga
                </Link>
                <button
                  type="submit"
                  disabled={!audioName.trim()}
                  className="order-1 sm:order-2 flex-1 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Matn yozishga o'tish →
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {stepOne && (
        <>
          <div className="sticky top-[56px] sm:top-[64px] z-20 bg-white border-b border-gray-200 shadow-md">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-2.5 sm:py-3">
              {isEditWithoutAudio && !overrideAudioSrc && (
                <div className="mb-2.5 sm:mb-3 p-3 sm:p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-lg sm:text-xl flex-shrink-0">⚠️</span>
                      <div className="text-xs sm:text-sm flex-1">
                        <div className="font-semibold mb-0.5">
                          Audio fayl muddati tugagan yoki sessiya yangilangan
                        </div>
                        <div className="opacity-80">
                          Matnni tahrirlashingiz <strong>mumkin</strong> (avtomatik saqlanadi). Audio tinglash uchun quyidan faylni qayta yuklang va avtomatik <strong>{formatTime(initialProgress)}</strong> soniyadan davom eting.
                        </div>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-xs sm:text-sm shadow cursor-pointer transition-all whitespace-nowrap">
                      <span>📤</span> Faylni yuklash
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleReUploadAudio(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {overrideAudioSrc && audioReUploadName && isEditWithoutAudio && (
                <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="font-bold">✅ Audio tiklandi:</span>
                  <span className="truncate font-medium">{audioReUploadName}</span>
                  <span className="opacity-80">
                    — <strong>{formatTime(initialProgress)}</strong> dan davom etadi
                  </span>
                  <label className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-medium cursor-pointer transition-all">
                    🔄 Almashtirish
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleReUploadAudio(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}

              <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onSeeked={() => {
                  lastProgressSaveRef.current = Date.now();
                }}
                preload="auto"
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-blue-600 text-lg sm:text-xl flex-shrink-0">🎵</span>
                    <input
                      type="text"
                      value={audioName}
                      onChange={onNameChange}
                      className="font-semibold text-gray-800 truncate text-sm sm:text-base bg-transparent outline-none focus:bg-blue-50 rounded px-2 py-0.5 transition-all min-w-0 flex-1 border border-transparent focus:border-blue-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:block text-xs sm:text-sm bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {wordCount} so'z
                    </div>
                    <SaveBadge status={saveStatus} />
                    <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => skipBack(5)}
                    disabled={!audioSrc}
                    className={`hidden sm:flex w-10 h-10 rounded-full items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                      !audioSrc
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="5 soniyaga orqaga"
                  >
                    ⟲5
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!audioSrc}
                    className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                      !audioSrc
                        ? 'bg-gray-300 cursor-not-allowed shadow-none active:scale-100'
                        : isPlaying
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 animate-pulse active:scale-95'
                          : 'bg-gradient-to-br from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 active:scale-95'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">
                      {!audioSrc ? '🔇' : isPlaying ? '⏸' : '▶'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => skipFwd(5)}
                    disabled={!audioSrc}
                    className={`hidden sm:flex w-10 h-10 rounded-full items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                      !audioSrc
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="5 soniyaga oldinga"
                  >
                    5⟳
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={!audioSrc}
                      className={`w-full h-1.5 sm:h-2 rounded-lg appearance-none ${
                        !audioSrc
                          ? 'bg-gray-100 accent-gray-300 cursor-not-allowed'
                          : 'bg-gray-200 cursor-pointer accent-blue-600'
                      }`}
                    />
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-0.5 font-mono sm:hidden">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col gap-1 items-end ml-2 min-w-[100px]">
                    <div className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                      {wordCount} so'z
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveNow}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-200 transition-all"
                    >
                      💾 Hoziroq saqlash
                    </button>
                  </div>
                </div>

                {isDesktop && hintVisible && (
                  <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-800 mt-1">
                    <span className="text-base flex-shrink-0">⌨️</span>
                    <div className="flex-1">
                      <strong>Left Shift</strong> — Pause/Play •{' '}
                      <strong>Ctrl + Enter</strong> — 5 son. orqaga • Barchasi avtomatik saqlanadi.{' '}
                      <button
                        type="button"
                        onClick={() => setHintVisible(false)}
                        className="underline text-blue-600 hover:text-blue-700 ml-1"
                      >
                        Yopish
                      </button>
                    </div>
                  </div>
                )}

                <div className="sm:hidden flex gap-2 mt-1">
                  <div className="flex-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => skipBack(5)}
                      disabled={!audioSrc}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        !audioSrc ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      ⟲5
                    </button>
                    <button
                      type="button"
                      onClick={() => skipFwd(5)}
                      disabled={!audioSrc}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        !audioSrc ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      5⟳
                    </button>
                  </div>
                  <div className="flex-1 flex gap-1">
                    <div className="flex-1 text-center text-xs bg-blue-100 text-blue-700 px-1.5 py-1.5 rounded-lg font-medium">
                      {wordCount} so'z
                    </div>
                    <SaveBadge status={saveStatus} compact />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 px-2 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="hidden sm:flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-2.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="flex items-center gap-1">📄 <span>Document</span></span>
                    <span>•</span>
                    <span>📊 Umumiy: {user.totalWords} so'z • {recentCount} ta audio</span>
                    <span>•</span>
                    <span>
                      ▶️ Oxirgi o'rn: <strong>{formatTime(initialProgress)}</strong>
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs">Asadbek Posts © 2026</div>
                </div>

                <div className="p-3 sm:p-6 md:p-10 bg-white">
                  <textarea
                    ref={textareaRef}
                    value={transcript}
                    onChange={onTranscriptChange}
                    placeholder={`Audioni tinglab, eshitilgan so'zlarni bu yerga yozing...\n\nMasalan:\nHello everyone, and welcome to today's lesson. We are going to talk about...`}
                    spellCheck={false}
                    className="w-full min-h-[420px] sm:min-h-[540px] md:min-h-[640px] resize-none outline-none text-gray-800 text-base sm:text-lg md:text-xl leading-relaxed sm:leading-8 md:leading-9 tracking-normal sm:tracking-wide bg-transparent"
                    style={{
                      fontFamily:
                        "'Times New Roman', Georgia, 'Noto Serif', serif",
                      lineHeight: '1.9',
                    }}
                  />
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                        {wordCount} so'z
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium">
                        {transcript.length} belgi
                      </span>
                      <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-medium">
                        ⏳ 1 kun vaqti
                      </span>
                      <span className="bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg font-medium">
                        ⏯️ Audio: {formatTime(currentTime)}
                      </span>
                      <SaveBadge status={saveStatus} />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Link
                        to="/"
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold text-sm text-center transition-all"
                      >
                        ← Boshiga
                      </Link>
                      <button
                        type="button"
                        onClick={handleSaveNow}
                        className="sm:hidden flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold transition-all shadow"
                      >
                        💾 Saqlash
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndExit}
                        disabled={!audioName.trim()}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-bold text-sm text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                      >
                        Saqlash va tarixdan ko'rish →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/85 backdrop-blur rounded-xl p-4 border border-white/40 shadow">
                  <div className="text-2xl mb-1">📥</div>
                  <div className="font-semibold text-gray-800 text-sm">Auto-save</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Yozganlaringiz 0.5 soniyada saqlanadi
                  </div>
                </div>
                <div className="bg-white/85 backdrop-blur rounded-xl p-4 border border-white/40 shadow">
                  <div className="text-2xl mb-1">⌨️</div>
                  <div className="font-semibold text-gray-800 text-sm">
                    {isDesktop ? 'Left Shift = Pause' : 'Katta Pause tugma'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isDesktop
                      ? 'Matn yozayotganda shiftni bosib to\'xtating'
                      : 'Yuqoridagi Pause tugmasidan foydalaning'}
                  </div>
                </div>
                <div className="bg-white/85 backdrop-blur rounded-xl p-4 border border-white/40 shadow">
                  <div className="text-2xl mb-1">🔁</div>
                  <div className="font-semibold text-gray-800 text-sm">Davom etish</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Tarixdan qaytganingda audio o'xshash joydan davom etadi
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}

function SaveBadge({ status, compact = false }: { status: SaveStatus; compact?: boolean }) {
  if (status === 'idle') {
    if (compact) {
      return (
        <div className="text-center text-xs bg-gray-50 text-gray-500 px-1.5 py-1.5 rounded-lg font-medium border border-gray-200">
          ✓
        </div>
      );
    }
    return (
      <span className="hidden sm:inline text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium border border-gray-200">
        Saqlandi
      </span>
    );
  }
  if (status === 'saving') {
    if (compact) {
      return (
        <div className="text-center text-xs bg-blue-50 text-blue-700 px-1.5 py-1.5 rounded-lg font-medium border border-blue-200 animate-pulse">
          …
        </div>
      );
    }
    return (
      <span className="hidden sm:inline text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
        Saqlanmoqda…
      </span>
    );
  }
  if (status === 'saved') {
    if (compact) {
      return (
        <div className="text-center text-xs bg-green-50 text-green-700 px-1.5 py-1.5 rounded-lg font-medium border border-green-200">
          ✓
        </div>
      );
    }
    return (
      <span className="hidden sm:inline text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
        ✓ Saqlandi
      </span>
    );
  }
  return (
    <span className="hidden sm:inline text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
      Xato
    </span>
  );
}
