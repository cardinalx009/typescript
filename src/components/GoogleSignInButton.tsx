import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Google script yuklanmadi'));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

interface Props {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  fallbackLabel: string;
}

export default function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
  fallbackLabel,
}: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [available, setAvailable] = useState<boolean | null>(null);

  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/google/config');
        const data = await res.json().catch(() => null);
        const clientId = data?.clientId;
        if (cancelled) return;
        if (!clientId) {
          setAvailable(false);
          return;
        }
        await loadGoogleScript();
        if (cancelled || !holderRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: { credential: string }) => callbackRef.current(resp.credential),
        });
        window.google.accounts.id.renderButton(holderRef.current, {
          theme: 'outline',
          size: 'large',
          width: Math.min(360, holderRef.current.offsetWidth || 360),
          text,
        });
        setAvailable(true);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (available === false) {
    return (
      <div className="w-full py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 text-center">
        {fallbackLabel}
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center min-h-[44px]">
      <div ref={holderRef} />
    </div>
  );
}
