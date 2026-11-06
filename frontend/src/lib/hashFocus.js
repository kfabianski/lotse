import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the element named in the URL hash (e.g. /ideas#idea-4) once the list has loaded and highlights it briefly. */
export function useHashFocus(ready) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('hash-focus');
    const t = setTimeout(() => el.classList.remove('hash-focus'), 2400);
    return () => clearTimeout(t);
  }, [ready, hash]);
}
